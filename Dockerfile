# syntax=docker/dockerfile:1

# This is based on Zeabur's zbpack PHP internal image.
# We add sane defaults so Zeabur MCP can build without passing build args.

ARG PHP_VERSION=8.3
FROM docker.io/library/php:${PHP_VERSION}-fpm

ENV APP_ENV=${APP_ENV:-prod}
ENV APP_DEBUG=${APP_DEBUG:-true}

WORKDIR /var/www

# install-php-extensions
ADD https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/
RUN chmod +x /usr/local/bin/install-php-extensions && sync

# apt dependencies and node.js
ARG APT_EXTRA_DEPENDENCIES=
ARG CADDY_VERSION=2.10.2
ARG CADDY_DEB_SHA256=1ecdbfe369c3fa052fc1918db5f6896aed6c9777dc1bae95c873f751bf6a7a71
RUN set -eux \
		&& apt update \
		&& apt install -y cron curl gettext git grep libicu-dev pkg-config unzip ${APT_EXTRA_DEPENDENCIES} \
		&& rm -rf /var/www/html \
		&& curl -fsSL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh \
		&& bash nodesource_setup.sh \
		&& apt install -y nodejs \
		&& curl -fsSLo /tmp/caddy.deb "https://github.com/caddyserver/caddy/releases/download/v${CADDY_VERSION}/caddy_${CADDY_VERSION}_linux_amd64.deb" \
		&& echo "${CADDY_DEB_SHA256}  /tmp/caddy.deb" | sha256sum -c - \
		&& apt install -y /tmp/caddy.deb \
		&& rm -f /tmp/caddy.deb \
		&& rm -rf /var/lib/apt/lists/*

# composer and php extensions
ARG PHP_EXTENSIONS="mailparse redis"
RUN install-php-extensions @composer apcu bcmath gd intl mysqli opcache pcntl pdo_mysql sysvsem zip ${PHP_EXTENSIONS}

# Provide Zeabur-compatible "_startup" entrypoint used by zeabur/start.sh.
RUN cat <<'EOF' > /usr/local/bin/_startup
#!/usr/bin/env bash
set -euo pipefail

php-fpm -D
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
EOF
RUN chmod +x /usr/local/bin/_startup

# project directory
RUN chown -R www-data:www-data /var/www
COPY --link --chown=www-data:www-data --chmod=755 . /var/www

# install dependencies (Composer scripts need an APP_KEY; provide a dummy build-time key only)
USER www-data
RUN set -eux \
		&& if [ -f composer.json ]; then APP_KEY=base64:$(php -r "echo base64_encode(random_bytes(32));") CACHE_DRIVER=file composer install --optimize-autoloader --classmap-authoritative --no-dev; fi \
		&& if [ -f package.json ]; then npm install; fi

ARG BUILD_COMMAND="npm run build"
RUN if [ -n "${BUILD_COMMAND}" ]; then ${BUILD_COMMAND}; fi

# optimization for frameworks (disable by default; runtime script builds env-aware caches)
ARG PHP_OPTIMIZE="false"
RUN <<EOF
	set -ux

	if [ ! "${PHP_OPTIMIZE}" = "true" ]; then
		echo "ZBPACK_PHP_OPTIMIZE is not set to true, skipping optimization"
		echo "You will need to run cache, optimization, and some build command manually."
		exit 0
	fi

	if [ -x artisan ]; then
		# Laravel
		php artisan optimize
		php artisan config:cache
		php artisan event:cache
		php artisan route:cache
		php artisan view:cache
	fi

	if [ -x bin/console ]; then
		# Symfony
		composer dump-env prod
		composer run-script --no-dev post-install-cmd
		php bin/console cache:clear

		# AssetMapper (optional)
		php bin/console asset-map:compile
	fi

	if [ -x ./node_modules/.bin/encore ]; then
		# Symfony Encore
		./node_modules/.bin/encore production
	fi

	# npm run build
	if grep -q '"build":' package.json; then
		npm run build
	fi
EOF

USER root

RUN install -d /etc/caddy \
	&& install -m 0644 /var/www/Caddyfile /etc/caddy/Caddyfile

ARG START_COMMAND="bash zeabur/start.sh"
ENV START_COMMAND=${START_COMMAND}
CMD eval ${START_COMMAND}

EXPOSE 8080
