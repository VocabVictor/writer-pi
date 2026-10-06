$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$noEnv = $false
$forwardArgs = New-Object System.Collections.Generic.List[string]

foreach ($arg in $args) {
	if ($arg -eq "--no-env") {
		$noEnv = $true
	} else {
		$forwardArgs.Add($arg)
	}
}

if ($noEnv) {
	# Keep in sync with packages/ai/src/envapikeys.ts, the authoritative provider
	# credential list; the trailing entries clear ambient git/CI/cloud config.
	$envVarsToUnset = @(
		"ANTHROPIC_AUTH_TOKEN",
		"ANTHROPIC_OAUTH_TOKEN",
		"ANTHROPIC_API_KEY",
		"COPILOT_GITHUB_TOKEN",
		"ANT_LING_API_KEY",
		"QWEN_TOKEN_PLAN_API_KEY",
		"QWEN_TOKEN_PLAN_CN_API_KEY",
		"OPENAI_API_KEY",
		"AZURE_OPENAI_API_KEY",
		"NVIDIA_API_KEY",
		"DEEPSEEK_API_KEY",
		"GEMINI_API_KEY",
		"GOOGLE_CLOUD_API_KEY",
		"GROQ_API_KEY",
		"CEREBRAS_API_KEY",
		"XAI_API_KEY",
		"TYPESAFE_API_KEY",
		"RADIUS_API_KEY",
		"OPENROUTER_API_KEY",
		"AI_GATEWAY_API_KEY",
		"ZAI_API_KEY",
		"ZAI_CODING_CN_API_KEY",
		"MISTRAL_API_KEY",
		"MINIMAX_API_KEY",
		"MINIMAX_CN_API_KEY",
		"MOONSHOT_API_KEY",
		"HF_TOKEN",
		"FIREWORKS_API_KEY",
		"TOGETHER_API_KEY",
		"BASETEN_API_KEY",
		"OPENCODE_API_KEY",
		"KIMI_API_KEY",
		"META_API_KEY",
		"CLOUDFLARE_API_KEY",
		"XIAOMI_API_KEY",
		"XIAOMI_TOKEN_PLAN_CN_API_KEY",
		"XIAOMI_TOKEN_PLAN_AMS_API_KEY",
		"XIAOMI_TOKEN_PLAN_SGP_API_KEY",
		"GH_TOKEN",
		"GITHUB_TOKEN",
		"GOOGLE_APPLICATION_CREDENTIALS",
		"GOOGLE_CLOUD_PROJECT",
		"GCLOUD_PROJECT",
		"GOOGLE_CLOUD_LOCATION",
		"AWS_PROFILE",
		"AWS_ACCESS_KEY_ID",
		"AWS_SECRET_ACCESS_KEY",
		"AWS_SESSION_TOKEN",
		"AWS_REGION",
		"AWS_DEFAULT_REGION",
		"AWS_BEARER_TOKEN_BEDROCK",
		"AWS_CONTAINER_CREDENTIALS_RELATIVE_URI",
		"AWS_CONTAINER_CREDENTIALS_FULL_URI",
		"AWS_WEB_IDENTITY_TOKEN_FILE",
		"AZURE_OPENAI_BASE_URL",
		"AZURE_OPENAI_RESOURCE_NAME"
	)

	foreach ($name in $envVarsToUnset) {
		Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue
	}

	Write-Host "Running without API keys..."
}

# --import takes a module specifier, so pass the resolver as a file URL (Windows paths are not specifiers).
$resolverUrl = ([System.Uri](Join-Path $scriptDir "packages/coding-agent/src/experimental/source-resolver.ts")).AbsoluteUri
$cliPath = Join-Path $scriptDir "packages/coding-agent/src/experimental/cli.ts"
& node --import $resolverUrl $cliPath @forwardArgs
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
	exit $exitCode
}
