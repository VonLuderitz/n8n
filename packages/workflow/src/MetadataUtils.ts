function responseHasSubworkflowData(
	response: Record<string, unknown> | undefined,
): response is { executionId: string; workflowId: string } {
	return ['executionId', 'workflowId'].every(
		(x) => response?.hasOwnProperty(x) && typeof response[x] === 'string',
	);
}

export function parseMetadata(response: Record<string, unknown> | undefined) {
	return responseHasSubworkflowData(response)
		? {
				subExecution: {
					executionId: response.executionId,
					workflowId: response.workflowId,
				},
			}
		: undefined;
}
