// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {Template} from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag'
import * as EcsCanary from '../lib/index';

test('Canary deployment pipeline is created', () => {
    const app = new cdk.App();
    cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))

    const stack = new cdk.Stack(app, 'EcsCanaryStack');
    // WHEN
    const ecsCanaryRoles = new EcsCanary.EcsCanaryRoles(stack, 'EcsCanaryRoles');
    const ecsCanaryBuildImage = new EcsCanary.EcsCanaryBuildImage(stack, 'EcsCanaryBuildImage', {
        codeBuildRole: ecsCanaryRoles.codeBuildRole,
        ecsTaskExecRole: ecsCanaryRoles.ecsExecutionTaskRole,
        codeRepoName: 'books',
        codeRepoDesc: 'source code for books API',
        dockerHubUsername: 'username',
        dockerHubPassword: 'password'
    });
    const ecsCanaryCluster = new EcsCanary.EcsCanaryCluster(stack, 'EcsCanaryCluster', {
        cidr: '10.0.0.0/16'
    });
    new EcsCanary.EcsCanaryPipeline(stack, 'EcsCanaryPipeline', {
        apiName: 'books',
        cluster: ecsCanaryCluster.cluster,
        vpc: ecsCanaryCluster.vpc,
        ecrRepoName: ecsCanaryBuildImage.ecrRepo.repositoryName,
        codeBuildProjectName: ecsCanaryBuildImage.codeBuildProject.projectName,
        codeRepoName: 'books',
        ecsTaskRoleArn: ecsCanaryRoles.ecsTaskRole.roleArn,
        ecsTaskExecRoleArn: ecsCanaryRoles.ecsExecutionTaskRole.roleArn
    })

    // THEN
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::IAM::Role', 11);
    template.resourceCountIs('AWS::ECR::Repository', 1);
    template.resourceCountIs('AWS::CodeCommit::Repository', 1);
    template.resourceCountIs('AWS::CodeBuild::Project', 1);
    template.resourceCountIs('AWS::EC2::VPC', 1);
    template.resourceCountIs('AWS::ECS::Cluster', 1);
    template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
    template.resourceCountIs('AWS::ECS::Service', 2);
});