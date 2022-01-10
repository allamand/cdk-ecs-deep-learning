import {
  AwsLogDriver,
  AwsLogDriverMode,
  ContainerImage,
  Ec2Service,
  Ec2TaskDefinition,
  NetworkMode
} from '@aws-cdk/aws-ecs';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { ARecord, HostedZone, RecordTarget } from '@aws-cdk/aws-route53';
import { LoadBalancerTarget } from '@aws-cdk/aws-route53-targets';
import { CfnOutput, Construct, Duration, Stack } from '@aws-cdk/core';
import { PyTorchServiceProps } from './pytorchUtils';

/*
 ** //https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ecs-readme.html
 */
export class PyTorchInferenceGPU extends Construct {
  constructor(scope: Construct, id: string, props: PyTorchServiceProps) {
    super(scope, id);

    const stack = Stack.of(this);

    const pytorchInferenceGPU = new Ec2TaskDefinition(this, 'TaskDefGPU' + id, {
      networkMode: NetworkMode.AWS_VPC,
    });
    const container = pytorchInferenceGPU.addContainer('pytorch', {
      containerName: 'pytorch-inference-gpu',
      image: ContainerImage.fromRegistry(
        '763104351884.dkr.ecr.us-east-1.amazonaws.com/pytorch-inference:1.3.1-gpu-py36-cu101-ubuntu16.04',
      ),
      entryPoint: ['sh', '-c'],
      command: [
        'mxnet-model-server --start --foreground --mms-config /home/model-server/config.properties --models densenet=https://dlc-samples.s3.amazonaws.com/pytorch/multi-model-server/densenet/densenet.mar',
      ],
      memoryLimitMiB: 8111,
      cpu: 256,
      gpuCount: 1,
      essential: true,

      logging: new AwsLogDriver({
        streamPrefix: 'inference',
        mode: AwsLogDriverMode.NON_BLOCKING,
      }),
    });
    container.addPortMappings({ containerPort: 8080 });
    container.addPortMappings({ containerPort: 8081 });

    pytorchInferenceGPU.addToExecutionRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: ['*'],
        actions: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
        ],
      }),
    );

    //https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ecs-readme.html
    const service = new Ec2Service(this, 'Ec2Service', {
      cluster: props.cluster,
      serviceName: 'inferenceGPU',
      taskDefinition: pytorchInferenceGPU,
      enableExecuteCommand: true,
    });

    const domainZone = HostedZone.fromLookup(this, 'Zone', { domainName: props.domainZone! });

    const record = new ARecord(this, 'AliasRecord', {
      zone: domainZone,
      recordName: 'inference' + '.' + props.domainZone,
      target: RecordTarget.fromAlias(new LoadBalancerTarget(props.alb!)),
    });

    const targetGroup = props.listener!.addTargets('inferenceGPU', {
      //Uncomment if want to share the LB with different services
      //priority: 0,
      //conditions: [ListenerCondition.hostHeaders([record.domainName]), ListenerCondition.pathPatterns(['/*'])],
      port: 8080,
      targets: [service],
    });
    targetGroup.setAttribute('deregistration_delay.timeout_seconds', '120');
    targetGroup.configureHealthCheck({
      interval: Duration.seconds(35),
      healthyHttpCodes: '200,405',
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
      timeout: Duration.seconds(30),
      path: '/',
    });

    /*
     * Create command to run the Task
     */
    new CfnOutput(stack, 'EcsExecCommand' + id, {
      value: `ecs_exec_service ${props.cluster.clusterName} ${service.serviceName} ${pytorchInferenceGPU.defaultContainer?.containerName}`,
    });

    //cd samples
    //curl -O https://s3.amazonaws.com/model-server/inputs/flower.jpg
    // curl -X POST http://localhost:8080/predictions/densenet -T flower.jpg
    //curl -X POST https://inference.ecs.demo3.allamand.com/predictions/densenet -T flower.jpg
    new CfnOutput(stack, 'Inference' + id, {
      value: 'https://' + record.domainName,
    });
  }
}
