module.exports = {
	verbose: true,
	transform: {
		"^.+\\.ts?$": "ts-jest"
	},
	testURL: "http://localhost/",
	testRegex: "(/__tests__/.*|(\\.|/)(test))\\.ts$",
	testPathIgnorePatterns: [
		"/dist/",
		"/node_modules/"
	],
	moduleFileExtensions: [
		"ts",
		"js",
		"json"
	],
	restoreMocks: true,
	globals: {
		"ts-jest": {
			isolatedModules: true
		}
	},
}
