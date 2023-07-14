#!/usr/bin/env bash

######################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. #
# SPDX-License-Identifier: MIT-0                                     #
######################################################################

#############################################################################
# Container image resources
##############################################################################
echo -e "Start building the container image stack resources...."

export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_DEFAULT_REGION=$(aws configure get region)
export CODE_REPO_NAME=sample-app

cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_DEFAULT_REGION

cdk --app "npx ts-node bin/image-stack.ts" deploy --require-approval never

echo -e "Completed building the container image stack resources...."
