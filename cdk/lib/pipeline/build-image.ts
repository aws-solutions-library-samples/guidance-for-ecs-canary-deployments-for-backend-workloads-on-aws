// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {CfnOutput} from 'aws-cdk-lib';
import {Repository} from 'aws-cdk-lib/aws-ecr';
import {Role} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import {BuildEnvironmentVariableType, ComputeType, Project} from 'aws-cdk-lib/aws-codebuild';
import ecr = require('aws-cdk-lib/aws-ecr');
import codeCommit = require('aws-cdk-lib/aws-codecommit');
import codeBuild = require('aws-cdk-lib/aws-codebuild');


export interface EcsCanaryBuildImageProps {
    readonly codeRepoName?: string;
    readonly codeRepoDesc?: string;
    readonly ecsTaskExecRole?: Role;
    readonly codeBuildRole?: Role;
    readonly dockerHubUsername?: string;
    readonly dockerHubPassword?: string;
}

export class EcsCanaryBuildImage extends Construct {

    public readonly ecrRepo: Repository;
    public readonly codeBuildProject: Project;

    constructor(scope: Construct, id: string, props: EcsCanaryBuildImageProps = {}) {
        super(scope, id);

        // ECR repository for the docker images
        this.ecrRepo = new ecr.Repository(this, 'ecrRepo', {
            imageScanOnPush: true
        });

        // CodeCommit repository for storing the source code
        var codeRepo = new codeCommit.Repository(this, 'codeRepo', {
            repositoryName: props.codeRepoName!,
            description: props.codeRepoDesc!
        });

        // Creating the code build project
        this.codeBuildProject = new codeBuild.Project(this, 'codeBuild', {
            role: props.codeBuildRole,
            description: 'Code build project for the application',
            environment: {
                buildImage: codeBuild.LinuxBuildImage.STANDARD_5_0,
                computeType: ComputeType.SMALL,
                privileged: true,
                environmentVariables: {
                    REPOSITORY_URI: {
                        value: this.ecrRepo.repositoryUri,
                        type: BuildEnvironmentVariableType.PLAINTEXT
                    },
                    TASK_EXECUTION_ARN: {
                        value: props.ecsTaskExecRole!.roleArn,
                        type: BuildEnvironmentVariableType.PLAINTEXT
                    }
                }
            },
            source: codeBuild.Source.codeCommit({
                repository: codeRepo,
                branchOrRef: 'main'
            })
        });

        // Export the outputs
        new CfnOutput(this, 'ecsCanaryCodeRepoName', {
            description: 'CodeCommit repository name',
            exportName: 'repoName',
            value: codeRepo.repositoryName
        });
        new CfnOutput(this, 'ecsCanaryEcrRepoName', {
            description: 'ECR repository name',
            exportName: 'ecsCanaryEcrRepoName',
            value: this.ecrRepo.repositoryName
        });
        new CfnOutput(this, 'canaryCodeBuildProjectName', {
            description: 'CodeBuild project name',
            exportName: 'canaryCodeBuildProjectName',
            value: this.codeBuildProject.projectName
        });
        new CfnOutput(this, 'ecsCanaryCodeRepoCloneURL', {
            description: 'CodeCommit repository clone URL',
            exportName: 'repoCloneUrlHttp',
            value: codeRepo.repositoryCloneUrlHttp
        });
    }
}