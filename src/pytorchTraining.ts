import { Construct } from 'constructs'
import { MACHINE_TYPE } from './infra';
import { PyTorchServiceProps } from './pytorchUtils';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { AwsLogDriver, AwsLogDriverMode, ContainerDefinitionOptions, ContainerImage, Ec2TaskDefinition, NetworkMode } from 'aws-cdk-lib/aws-ecs';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

/*
 ** //https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ecs-readme.html
 */
export class PyTorchTrainingCPU extends Construct {

  constructor(scope: Construct, id: string, props: PyTorchServiceProps) {
    super(scope, id);

    const stack = Stack.of(this);
    const cluster = props.cluster;

    const serviceSG = new SecurityGroup(this, 'serviceSecurityGroup', {
      vpc: props.vpc,
      description: 'ecs service securitygroup',
      allowAllOutbound: true,
    });

    const pytorchTraining = new Ec2TaskDefinition(this, 'TaskDef' + id, {
      networkMode: NetworkMode.AWS_VPC,
      //placementConstraints: [PlacementConstraint.memberOf(`attributes:ecs.instance-type==${MACHINE_TYPE}`)],
      //"Invalid request provided: Create TaskDefinition: constraint.expression 'attributes:ecs.instance-type==p3.2xlarge'
      // inferenceAccelerators: InferenceAccelerator[
    });
    var containerTraining: ContainerDefinitionOptions = {
      containerName: 'pytorch-training-container',
      image: ContainerImage.fromRegistry(
        '763104351884.dkr.ecr.us-east-1.amazonaws.com/pytorch-training:1.5.1-cpu-py36-ubuntu16.04',
      ),
      entryPoint: ['sh', '-c'],
      command: ['git clone https://github.com/pytorch/examples.git && python examples/mnist/main.py --no-cuda'],
      memoryLimitMiB: 4000,
      cpu: 256,
      essential: true,
      logging: new AwsLogDriver({
        streamPrefix: 'mnist',
        mode: AwsLogDriverMode.NON_BLOCKING,
      }),
    };
    const container = pytorchTraining.addContainer('pytorch', containerTraining);
    container.addPortMappings({
      containerPort: 80,
      //protocol: Protocol.TCP,
    });
    //container.addToExecutionPolicy(
    pytorchTraining.addToExecutionRolePolicy(
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

    /*
     * Create command to run the Task
     */

    new CfnOutput(stack, 'RunTask-' + id, {
      value: `aws ecs run-task --cluster ${cluster.clusterName} --task-definition ${pytorchTraining.taskDefinitionArn} --placement-constraints type=memberOf,expression="attribute:ecs.instance-type == ${MACHINE_TYPE}" --network-configuration "awsvpcConfiguration={subnets=[${props.vpc.privateSubnets[0].subnetId},${props.vpc.privateSubnets[1].subnetId}],securityGroups=[${serviceSG.securityGroupId}],assignPublicIp=DISABLED}"`,
    });

    // //No Load Balancer for Admin Service
    // this.service = new Ec2Service(this, 'Service' + id, {
    //   cluster,
    //   serviceName: id, // when specifying service name, this prevent CDK to apply change to existing service Resource of type 'AWS::ECS::Service' with identifier 'eksutils' already exists.
    //   taskDefinition: pytorchTraining,
    //   desiredCount: 0,
    //   //platformVersion: FargatePlatformVersion.VERSION1_4,
    //   //securityGroups: [props.serviceSG],
    //   enableExecuteCommand: true,
    // });

    // new CfnOutput(stack, 'EcsExecCommand' + id, {
    //   value: `ecs_exec_service ${cluster.clusterName} ${this.service.serviceName} ${pytorchTraining.defaultContainer?.containerName}`,
    // });
  }
}
