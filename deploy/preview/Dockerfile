# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"

WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates git g++ make python3 \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Copy workspace manifests first so dependency installation stays cacheable.
COPY .npmrc ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/web/.npmrc apps/web/.npmrc
COPY layers/narduk-nuxt-layer/package.json layers/narduk-nuxt-layer/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json

# Package registry auth is mounted as a BuildKit secret so the token never
# lands in build args, image metadata, or committed files.
RUN --mount=type=secret,id=registry_token,required=false \
  set -eu; \
  temp_npmrc="$(mktemp)"; \
  cp .npmrc "${temp_npmrc}"; \
  registry_url="$(awk -F= '/^@narduk-enterprises:registry=/{print $2; exit}' "${temp_npmrc}")"; \
  if [ -z "${registry_url}" ]; then \
    registry_url='https://code.platform.nard.uk/api/packages/narduk-enterprises/npm/'; \
  fi; \
  auth_host_path="${registry_url#https://}"; \
  auth_host_path="${auth_host_path#http://}"; \
  if [ -s /run/secrets/registry_token ]; then \
    printf '\n//%s:_authToken=%s\n' "$auth_host_path" "$(tr -d '\r\n' < /run/secrets/registry_token)" >> "${temp_npmrc}"; \
  fi; \
  NPM_CONFIG_USERCONFIG="${temp_npmrc}" pnpm install --frozen-lockfile; \
  rm -f "${temp_npmrc}"

COPY apps/web apps/web
COPY layers/narduk-nuxt-layer layers/narduk-nuxt-layer
COPY packages/eslint-config packages/eslint-config
COPY scripts scripts
COPY tools tools

EXPOSE 3000

CMD ["bash", "-lc", "pnpm --dir apps/web exec nuxt dev --host 0.0.0.0 --port \"${NUXT_PORT:-3000}\""]
