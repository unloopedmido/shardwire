declare module 'validate-npm-package-name' {
	export default function validate(name: string): {
		validForNewPackages: boolean;
		validForOldPackages: boolean;
		warnings?: string[] | null;
		errors?: string[] | null;
	};
}
