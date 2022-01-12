
CDK_STACK_NAME?=cdk-eks-deep-learning2

diff:
	npx cdk diff

synth:
	npx cdk synth	

check:
	@echo "Check region" $(AWS_REGION) $(AWS_DEFAULT_REGION)
	@sleep 5

deploy: check
	npx cdk deploy --require-approval=never
deploy-no-rollback: check
	npx cdk deploy --require-approval=never --no-rollback  	

destroy:
	npx cdk destroy


describe:
	aws cloudformation describe-stacks --stack-name $(CDK_STACK_NAME) --query "Stacks[*].Outputs" --output table 
