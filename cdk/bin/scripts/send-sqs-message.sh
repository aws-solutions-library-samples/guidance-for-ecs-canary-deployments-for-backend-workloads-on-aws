#!/usr/bin/env bash

######################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. #
# SPDX-License-Identifier: MIT-0                                     #
######################################################################

echo -e "Sending messages..."

export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_DEFAULT_REGION=$(aws configure get region)

send-message-to-sqs() {
	endPoint=$1
	key=$2

	if [ -z $endPoint ] || [ -z $key ]; then
		echo "Queue URL and key are required"
		return
	fi
	
	aws sqs send-message-batch --queue-url $endPoint --entries "[{\"Id\": \"$key-1\", \"MessageBody\": \"Test Msg: $key-1\"},{\"Id\": \"$key-2\", \"MessageBody\": \"Test Msg: $key-2\"},{\"Id\": \"$key-3\", \"MessageBody\": \"Test Msg: $key-3\"},{\"Id\": \"$key-4\", \"MessageBody\": \"Test Msg: $key-4\"},{\"Id\": \"$key-5\", \"MessageBody\": \"Test Msg: $key-5\"}]"
}

queueUrl=$(aws sqs get-queue-url --queue-name helloworld --query 'QueueUrl' --output text)

echo "Queue URL:  $queueUrl"

for i in {1..100}
do
   	# do whatever on $i
	echo "Key : $i"
	#echo "sending message to sqs queue"
	send-message-to-sqs $queueUrl $i
    #sleep 1   
done
