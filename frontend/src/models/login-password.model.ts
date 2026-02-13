export class LoginPassword {
	username?: string;
	password?: string;

	constructor(loginPassword: Partial<LoginPassword>) {
		Object.assign(this, loginPassword)
	}
}
