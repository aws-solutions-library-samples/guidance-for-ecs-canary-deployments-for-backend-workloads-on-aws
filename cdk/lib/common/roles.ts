// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {Effect, ManagedPolicy, Role, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
import iam = require('aws-cdk-lib/aws-iam');
import { Construct } from 'constructs';
import {CfnOutput,Aws} from 'aws-cdk-lib';

export class EcsCanaryRoles extends Construct {

    public readonly ecsTaskRole: Role;
    public readonly ecsExecutionTaskRole: Role;
    public readonly codeBuildRole: Role;
    public readonly customLambdaServiceRole: Role;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // ECS task role
        this.ecsExecutionTaskRole = new iam.Role(this, 'ecsExecutionTaskRoleForWorkshop', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com')
        });

        this.ecsExecutionTaskRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'));

        // ECS task role
        this.ecsTaskRole = new iam.Role(this, 'ecsTaskRoleForWorkshop', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com')
        });

        // IAM role for the Code Build project
        this.codeBuildRole = new iam.Role(this, 'codeBuildServiceRole', {
            assumedBy: new ServicePrincipal('codebuild.amazonaws.com')
        });

        const
            inlinePolicyForCodeBuild = new iam.PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    's3:PutObject',
                    's3:GetObject',
                    's3:GetObjectVersion',
                    's3:GetBucketAcl',
                    's3:GetBucketLocation',
                    'ecr:BatchCheckLayerAvailability',
                    'ecr:CompleteLayerUpload',
                    'ecr:GetAuthorizationToken',
                    'ecr:InitiateLayerUpload',
                    'ecr:PutImage',
                    'ecr:UploadLayerPart',
                ],
                resources: ['*']
            });
        this.codeBuildRole.addToPolicy(inlinePolicyForCodeBuild);

        // IAM role for custom lambda function
        this.customLambdaServiceRole = new iam.Role(this, 'codePipelineCustomLambda', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com')
        });

        this.customLambdaServiceRole.addToPolicy(new iam.PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'codepipeline:List*',
                'codepipeline:Get*',
                'codepipeline:StopPipelineExecution',
                'codepipeline:PutApprovalResult'
            ],
            resources: ['*']
        }));

        this.customLambdaServiceRole.addToPolicy(new iam.PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'ecs:ListServices',
                'ecs:UpdateService',
                'ecs:DescribeServices'
            ],
            resources: ['arn:aws:ecs:'+Aws.REGION+':'+Aws.ACCOUNT_ID+':service/ecsDemoCluster/sample-app','arn:aws:ecs:'+Aws.REGION+':'+Aws.ACCOUNT_ID+':service/ecsDemoCluster/sample-app-canary']
        }));

        this.customLambdaServiceRole.addToPolicy(new iam.PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'iam:PassRole'
            ],
            resources: [this.ecsTaskRole.roleArn]
        }));

        this.customLambdaServiceRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'))

        new CfnOutput(this, 'ecsCanaryTaskRoleArn', {
            description: 'ECS task role arn',
            exportName: 'ecsCanaryTaskRoleArn',
            value: this.ecsTaskRole.roleArn
        });

        new CfnOutput(this, 'ecsCanaryTaskExecRoleArn', {
            description: 'ECS task execution role arn',
            exportName: 'ecsCanaryTaskExecRoleArn',
            value: this.ecsExecutionTaskRole.roleArn
        });

        new CfnOutput(this, 'customLambdaRoleArn', {
            description: 'Custom Lambda role arn',
            exportName: 'customLambdaRoleArn',
            value: this.customLambdaServiceRole.roleArn
        });

    }

}