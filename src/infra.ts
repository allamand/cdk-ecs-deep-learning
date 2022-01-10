import { AutoScalingGroup, GroupMetrics, Monitoring } from '@aws-cdk/aws-autoscaling';
import { InstanceType, IVpc, Port, Vpc } from '@aws-cdk/aws-ec2';
import {
  AmiHardwareType,
  AsgCapacityProvider, Cluster, EcsOptimizedImage,
  ExecuteCommandLogging
} from '@aws-cdk/aws-ecs';
import { ApplicationListener, ApplicationLoadBalancer, ListenerCertificate } from '@aws-cdk/aws-elasticloadbalancingv2';
import { Key } from '@aws-cdk/aws-kms';
import { LogGroup } from '@aws-cdk/aws-logs';
import { Bucket } from '@aws-cdk/aws-s3';
import { StringParameter } from '@aws-cdk/aws-ssm';
import { CfnOutput, Construct, RemovalPolicy, Stack } from '@aws-cdk/core';

export const MACHINE_TYPE = 'p2.8xlarge'; //p3.2xlarge

interface InfraProps {
  vpcTagName?: string; // Specify if you want to reuse existing VPC (or "default" for default VPC), else it will create a new one
  clusterName: string; // Specify if you want to reuse existing ECS cluster, else it will create new one
  createCluster: boolean;
  domainZone: string;
  stackName: string;
}

export class Infra extends Construct {
  readonly vpc: IVpc;
  readonly cluster;
  readonly kmsKey: Key;
  readonly execBucket: Bucket;
  readonly execLogGroup: LogGroup;
  readonly listener: ApplicationListener;
  readonly alb: ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: InfraProps) {
    super(scope, id);
    const stack = Stack.of(this);
     
    //Define VPC
    if (props.vpcTagName) {
      if (props.vpcTagName == 'default') {
        this.vpc = Vpc.fromLookup(this, 'VPC', { isDefault: true });
      } else {
        this.vpc = Vpc.fromLookup(this, 'VPC', { tags: { Name: props.vpcTagName } });
      }
    } else {
      this.vpc = new Vpc(this, 'VPC', { maxAzs: 2 });
    }

    // Create kms key for secure logging and secret store encryption
    // docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html
    this.kmsKey = new Key(this, 'ECSKmsKey', {
      alias: id + '-kms-ecs-' + props.clusterName,
    });
    new CfnOutput(stack, 'EcsKMSAlias', { value: this.kmsKey.keyArn });
    // Secure ecs exec loggings
    this.execLogGroup = new LogGroup(this, 'ECSExecLogGroup', {
      removalPolicy: RemovalPolicy.DESTROY,
      logGroupName: '/ecs/secu/exec/' + props.clusterName,
      encryptionKey: this.kmsKey,
    });
    new CfnOutput(stack, 'EcsExecLogGroupOut', { value: this.execLogGroup.logGroupName });
    this.execBucket = new Bucket(this, 'EcsExecBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryptionKey: this.kmsKey,
    });
    new CfnOutput(stack, 'EcsExecBucketOut', { value: this.execBucket.bucketName });

    //https://github.com/PasseiDireto/gh-runner-ecs-ec2-stack/blob/cc6c13824bec5081e2d39a7adf7e9a2d0c8210a1/cluster.ts
    const asgGPU: AutoScalingGroup = new AutoScalingGroup(this, 'Asg', {
      vpc: this.vpc,
      machineImage: EcsOptimizedImage.amazonLinux2(AmiHardwareType.GPU),

      instanceType: new InstanceType(MACHINE_TYPE),

      minCapacity: 1,
      maxCapacity: 4,
      instanceMonitoring: Monitoring.DETAILED,
      groupMetrics: [GroupMetrics.all()],
      // https://github.com/aws/aws-cdk/issues/11581
    });

    const capacityProvider1 = new AsgCapacityProvider(this, 'CP1', {
      autoScalingGroup: asgGPU,
      enableManagedScaling: true,
      enableManagedTerminationProtection: true,
      targetCapacityPercent: 100, //don't over-provisionning
    });

    //Define ECS Cluster
    // Reference existing network and cluster infrastructure
    if (!props.createCluster) {
      this.cluster = Cluster.fromClusterAttributes(this, 'Cluster', {
        clusterName: props.clusterName,
        vpc: this.vpc,
        securityGroups: [],
      });
    } else {
      this.cluster = new Cluster(this, 'Cluster', {
        clusterName: props.clusterName,
        vpc: this.vpc,
        containerInsights: true,
        enableFargateCapacityProviders: true,
        executeCommandConfiguration: {
          kmsKey: this.kmsKey,
          logConfiguration: {
            cloudWatchLogGroup: this.execLogGroup,
            cloudWatchEncryptionEnabled: true,
            s3Bucket: this.execBucket,
            s3EncryptionEnabled: true,
            s3KeyPrefix: 'exec-command-output',
          },
          logging: ExecuteCommandLogging.OVERRIDE,
        },
      });
      //Cast cluster to Cluster instead of ICluster
      const cluster = this.cluster as Cluster;
      cluster.addAsgCapacityProvider(capacityProvider1);
    }
    new CfnOutput(this, 'ClusterName', { value: this.cluster.clusterName });

    //Define TLS Certificate
    // Lookup pre-existing TLS certificate
    const certificateArn = StringParameter.fromStringParameterAttributes(this, 'CertArnParameter', {
      parameterName: 'CertificateArn-' + props.domainZone,
    }).stringValue;
    const certificate = ListenerCertificate.fromArn(certificateArn);


    this.alb = new ApplicationLoadBalancer(this, 'ALB', {
      vpc: this.vpc,
      internetFacing: true,
      //loadBalancerName: 'ecs-deep-learning',
    });

    this.listener = this.alb.addListener('Listener', { port: 443 });
    this.listener.addCertificates('cert', [certificate]);
    this.alb.addRedirect; //default to http -> https

    this.alb.connections.allowTo(asgGPU.connections, Port.allTraffic());
    asgGPU.connections.allowFrom(this.alb.connections, Port.allTraffic());

  }
}
