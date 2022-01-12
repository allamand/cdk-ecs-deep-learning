import { SecurityGroup } from '@aws-cdk/aws-ec2';
import {
  AwsLogDriver,
  AwsLogDriverMode,
  ContainerImage, Ec2TaskDefinition,
  NetworkMode,
} from '@aws-cdk/aws-ecs';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { CfnOutput, Construct, Stack } from '@aws-cdk/core';
import { MACHINE_TYPE } from './infra';
import { PyTorchServiceProps } from './pytorchUtils';

/*
 ** //https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ecs-readme.html
 */
export class PyTorchTrainingGPU extends Construct {

  constructor(scope: Construct, id: string, props: PyTorchServiceProps) {
    super(scope, id);

    const stack = Stack.of(this);
    const cluster = props.cluster;

    const serviceSG = new SecurityGroup(this, 'serviceSecurityGroup', {
      vpc: props.vpc,
      description: 'ecs service securitygroup',
      allowAllOutbound: true,
    });

    const pytorchTrainingGPU = new Ec2TaskDefinition(this, 'TaskDefGPU' + id, {

      networkMode: NetworkMode.AWS_VPC,
      //placementConstraints: [PlacementConstraint.memberOf(`attributes:ecs.instance-type==${MACHINE_TYPE}`)],
      //"Invalid request provided: Create TaskDefinition: constraint.expression 'attributes:ecs.instance-type==p3.2xlarge'
      // inferenceAccelerators: InferenceAccelerator[
    });
    const container = pytorchTrainingGPU.addContainer('pytorch', {
      containerName: 'pytorch-training-container-gpu',
      image: ContainerImage.fromRegistry(
        '763104351884.dkr.ecr.us-east-1.amazonaws.com/pytorch-training:1.5.1-gpu-py36-cu101-ubuntu16.04',
      ),
      entryPoint: ['sh', '-c'],
      command: ['git clone https://github.com/pytorch/examples.git && python examples/mnist/main.py'],
      memoryLimitMiB: 6111,
      cpu: 256,
      gpuCount: 1,
      essential: true,

      logging: new AwsLogDriver({
        streamPrefix: 'mnist',
        mode: AwsLogDriverMode.NON_BLOCKING,
      }),
    });
    container.addPortMappings({
      containerPort: 80,
      //protocol: Protocol.TCP,
    });

    pytorchTrainingGPU.addToExecutionRolePolicy(
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
      value: `aws ecs run-task --cluster ${cluster.clusterName} --task-definition ${pytorchTrainingGPU.taskDefinitionArn} --placement-constraints type=memberOf,expression="attribute:ecs.instance-type == ${MACHINE_TYPE}" --network-configuration "awsvpcConfiguration={subnets=[${props.vpc.privateSubnets[0].subnetId},${props.vpc.privateSubnets[1].subnetId}],securityGroups=[${serviceSG.securityGroupId}],assignPublicIp=DISABLED}"`,
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
