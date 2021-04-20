import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { Certificate, ValidationMethod } from "@aws-cdk/aws-certificatemanager";
import { DOMAIN_NAME } from "../../../settings";

/**
 * @deprecated
 *
 * This stack was experimental and is not used currently. It could become of use for deploying to
 * domains managed in Route 53.
 */
export class SpicedlingsFinalProjectsCertificate extends Stack {
	public certificate: Certificate;

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		this.certificate = new Certificate(this, "Certificate", {
			domainName: `*.${DOMAIN_NAME}`,
			validationMethod: ValidationMethod.DNS,
		});
	}
}
