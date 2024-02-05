import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Infra } from './infra';
import { PyTorchInferenceGPU } from './pytorchInferenceGPU';
import { PyTorchTrainingCPU } from './pytorchTraining';
import { PyTorchTrainingGPU } from './pytorchTrainingGPU';
import { Construct } from 'constructs'

//https://www.npmjs.com/package/@aws-cdk-containers/ecs-service-extensions?activeTab=readme

const stackName = process.env.CDK_STACK_NAME ? process.env.CDK_STACK_NAME : 'cdk-eks-deep-learning';
const domainZone = process.env.DOMAIN_ZONE ? process.env.DOMAIN_ZONE : 'my-hosted-zone.com';
const vpcTagName = process.env.VPC_TAG_NAME;
const clusterName = process.env.CLUSTER_NAME ? process.env.CLUSTER_NAME : stackName;

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

interface ECSStackProps extends StackProps {
  vpcTagName?: string; // Specify if you want to reuse existing VPC (or "default" for default VPC), else it will create a new one
  clusterName: string; // Specify if you want to reuse existing ECS cluster, else it will create new one
  createCluster: boolean;
  domainZone: string;
  stackName: string;
}

const app = new App();

export class ECSDeepLearning extends Stack {
  constructor(scope: Construct, id: string, props: ECSStackProps) {
    super(scope, id, props);

    const stack = Stack.of(this);

    const infra = new Infra(stack, stackName, {
      stackName: stackName,
      domainZone: domainZone,
      vpcTagName: vpcTagName,
      clusterName: clusterName,
      createCluster: true,
    });

    new PyTorchTrainingCPU(stack, 'pytorchTrainingCPU', {
      vpc: infra.vpc,
      cluster: infra.cluster,
      kmsKey: infra.kmsKey,
      execBucket: infra.execBucket,
      execLogGroup: infra.execLogGroup,
    });
    new PyTorchTrainingGPU(stack, 'pytorchTrainingGPU', {
      vpc: infra.vpc,
      cluster: infra.cluster,
      kmsKey: infra.kmsKey,
      execBucket: infra.execBucket,
      execLogGroup: infra.execLogGroup,
    });

    new PyTorchInferenceGPU(stack, 'pytorchInferencePU', {
      vpc: infra.vpc,
      cluster: infra.cluster,
      kmsKey: infra.kmsKey,
      execBucket: infra.execBucket,
      execLogGroup: infra.execLogGroup,
      domainZone: domainZone,
      listener: infra.listener,
      alb: infra.alb,
    });
  }
}

new ECSDeepLearning(app, stackName, {
  stackName: stackName,
  domainZone: domainZone,
  vpcTagName: vpcTagName,
  clusterName: clusterName,
  createCluster: true,
  env: devEnv,
});

app.synth();
