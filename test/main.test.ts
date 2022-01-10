import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { ECSDeepLearning } from '../src/main';

test('Snapshot', () => {
  const app = new App();

  const stackName = process.env.CDK_STACK_NAME ? process.env.CDK_STACK_NAME : 'cdk-eks-deep-learning';
  const domainZone = process.env.DOMAIN_ZONE ? process.env.DOMAIN_ZONE : 'ecs.mydomain.com';
  const vpcTagName = process.env.VPC_TAG_NAME; //? process.env.VPC_TAG_NAME : 'ecsworkshop-base/BaseVPC';
  const clusterName = process.env.CLUSTER_NAME ? process.env.CLUSTER_NAME : domainName;


  const devEnv = {
    account: '1234567890',
    region: 'us-east-1',
  };

  const stack = new ECSDeepLearning(app, 'test', {
    stackName: stackName,
    domainZone: domainZone,
    vpcTagName: vpcTagName,
    clusterName: clusterName,
    createCluster: true,
    env: devEnv,
  });

  expect(stack).toHaveResource('AWS::S3::Bucket');
  expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
});