<?php

/*
 * Resolve a list config from env: use default file, or custom file path, or comma-separated values.
 * Set env key to a path (absolute or relative to project base) to use a PHP file that returns an array.
 * Set env key to comma-separated values to override with a simple list.
 */
$resolveList = function (string $envKey, string $defaultPath): array {
    $value = env($envKey);
    if ($value === null || $value === '') {
        return require $defaultPath;
    }
    $value = trim($value);
    if (str_starts_with($value, '/') && is_file($value)) {
        return require $value;
    }
    $relativePath = base_path($value);
    if (is_file($relativePath)) {
        return require $relativePath;
    }
    if (str_contains($value, '/') || str_ends_with($value, '.php')) {
        $path = str_starts_with($value, '/') ? $value : $relativePath;
        if (is_file($path)) {
            return require $path;
        }

        return require $defaultPath;
    }

    return array_values(array_filter(array_map('trim', explode(',', $value))));
};

return [

    /*
    |--------------------------------------------------------------------------
    | Version
    |--------------------------------------------------------------------------
    |
    | Returns the app version if set as an environment variable
    |
    */

    'version' => env('VOVAMAIL_VERSION'),

    /*
    |--------------------------------------------------------------------------
    | Return Path
    |--------------------------------------------------------------------------
    |
    | This will be used as the return-path header for outbound emails
    |
    */

    'return_path' => env('VOVAMAIL_RETURN_PATH'),

    /*
    |--------------------------------------------------------------------------
    | Admin Username
    |--------------------------------------------------------------------------
    |
    | If set this value will be used and allow you to receive forwarded emails
    | at the root domain, e.g. @example.com aswell as @username.example.com
    |
    */

    'admin_username' => env('VOVAMAIL_ADMIN_USERNAME'),

    /*
    |--------------------------------------------------------------------------
    | Non-Admin Username Subdomains
    |--------------------------------------------------------------------------
    |
    | If set to false this will prevent any non-admin users from being able to create
    | username subdomain aliases at any domains that have been set for 'all_domains' below
    |
    */

    'non_admin_username_subdomains' => env('VOVAMAIL_NON_ADMIN_USERNAME_SUBDOMAINS', true),

    /*
    |--------------------------------------------------------------------------
    | Non-Admin Shared Domains
    |--------------------------------------------------------------------------
    |
    | If set to false this will prevent any non-admin users from being able to create
    | shared domain aliases at any domains that have been set for 'all_domains' below
    |
    */

    'non_admin_shared_domains' => env('VOVAMAIL_NON_ADMIN_SHARED_DOMAINS', true),

    /*
    |--------------------------------------------------------------------------
    | Enable Registration
    |--------------------------------------------------------------------------
    |
    | If set to false this will prevent new users from registering on the site
    | useful if you are self-hosting and do not want anyone else to be able to register
    |
    */

    'enable_registration' => env('VOVAMAIL_ENABLE_REGISTRATION', true),

    /*
    |--------------------------------------------------------------------------
    | Domain
    |--------------------------------------------------------------------------
    |
    | If set and you are self hosting vovamail.xyz then a check will be done so that you can
    | receive email at the root domain, e.g. @example.com aswell as @username.example.com
    |
    */

    'domain' => env('VOVAMAIL_DOMAIN'),

    /*
    |--------------------------------------------------------------------------
    | Hostname
    |--------------------------------------------------------------------------
    |
    | This value is your FQDN hostname for your server e.g. mail.example.com
    | it is used to validate records on custom domains that are added by users
    |
    */

    'hostname' => env('VOVAMAIL_HOSTNAME'),

    /*
    |--------------------------------------------------------------------------
    | DNS Resolver
    |--------------------------------------------------------------------------
    |
    | This value is used when validating records on custom domains that are added
    | by users, if you don't have a local caching name server you can use 1.1.1.1 etc.
    |
    */

    'dns_resolver' => env('VOVAMAIL_DNS_RESOLVER', '127.0.0.1'),

    /*
    |--------------------------------------------------------------------------
    | Blocklist API (Rspamd / internal mail servers)
    |--------------------------------------------------------------------------
    |
    | Used by the blocklist-check endpoint. Only requests from
    | allowed IPs (and with the shared secret if set) are accepted.
    |
    */

    'blocklist' => [
        'allowed_ips' => array_filter(array_map('trim', explode(',', env('BLOCKLIST_API_ALLOWED_IPS', '127.0.0.1')))),
        'secret' => env('BLOCKLIST_API_SECRET', ''),
    ],

    /*
    |--------------------------------------------------------------------------
    | Postfix Log Path
    |--------------------------------------------------------------------------
    |
    | The path to the postfix log file, used for parsing inbound rejections
    |
    */

    'postfix_log_path' => env('POSTFIX_LOG_PATH', '/var/log/mail.log'),

    /*
    |--------------------------------------------------------------------------
    | All Domains
    |--------------------------------------------------------------------------
    |
    | If you would like to have other domains to use e.g. @username.example2.com
    | enter a comma separated list in your .env file like so, example.com,example2.com
    |
    */

    'all_domains' => explode(',', env('VOVAMAIL_ALL_DOMAINS', '[]')),

    /*
    |--------------------------------------------------------------------------
    | Secret
    |--------------------------------------------------------------------------
    |
    | Simply a long random string used when hashing data for the anonymous
    | replies, make sure that you set something suitably long and random in your .env
    |
    */

    'secret' => env('VOVAMAIL_SECRET'),

    /*
    |--------------------------------------------------------------------------
    | Hourly Email Limit
    |--------------------------------------------------------------------------
    |
    | This value is an integer that determines the number of emails a user can forward
    | and reply per hour, e.g. 200 would mean the user is rate limited to 200 emails per hour
    |
    */

    'limit' => (int) env('VOVAMAIL_LIMIT', 200),

    /*
    |--------------------------------------------------------------------------
    | Monthly Bandwidth Limit
    |--------------------------------------------------------------------------
    |
    | This value is an integer that determines the monthly bandwidth
    | limit for users in bytes the default value is 104857600 which is 100MB
    |
    */

    'bandwidth_limit' => (int) env('VOVAMAIL_BANDWIDTH_LIMIT', 104857600),

    /*
    |--------------------------------------------------------------------------
    | New Alias Hourly Limit
    |--------------------------------------------------------------------------
    |
    | This value is an integer that determines the number of new aliases
    | a user can create each hour, the default value is 100 aliases per hour
    |
    */

    'new_alias_hourly_limit' => (int) env('VOVAMAIL_NEW_ALIAS_LIMIT', 100),

    /*
    |--------------------------------------------------------------------------
    | Additional Username Limit
    |--------------------------------------------------------------------------
    |
    | This value is an integer that determines the number of additional
    | usernames a user can add to their account, the default value is 10
    |
    */

    'additional_username_limit' => (int) env('VOVAMAIL_ADDITIONAL_USERNAME_LIMIT', 10),

    /*
    |--------------------------------------------------------------------------
    | Signing Key Fingerprint
    |--------------------------------------------------------------------------
    |
    | This is the fingerprint of the gpg key to be used to sign forwarded
    | emails, it should be the same as your mail from email address
    |
    */

    'signing_key_fingerprint' => env('VOVAMAIL_SIGNING_KEY_FINGERPRINT', null),

    /*
    |--------------------------------------------------------------------------
    | DKIM Signing Key Path
    |--------------------------------------------------------------------------
    |
    | This is the path to the private DKIM signing key to be used to sign emails for
    | custom domains. The custom domains must have the correct selector records
    |
    */

    'dkim_signing_key' => env('VOVAMAIL_DKIM_SIGNING_KEY') ? file_get_contents(env('VOVAMAIL_DKIM_SIGNING_KEY')) : null,

    /*
    |--------------------------------------------------------------------------
    | DKIM Signing Key Selector
    |--------------------------------------------------------------------------
    |
    | This is the selector for the current DKIM signing key e.g. default
    |
    */

    'dkim_selector' => env('VOVAMAIL_DKIM_SELECTOR', 'default'),

    /*
    |--------------------------------------------------------------------------
    | Auto Verify New Recipients
    |--------------------------------------------------------------------------
    |
    | If enabled, new recipients will be verified automatically
    |
    */

    'auto_verify_new_recipients' => env('VOVAMAIL_AUTO_VERIFY_NEW_RECIPIENTS', false),

    /*
    |--------------------------------------------------------------------------
    | Use Proxy authentication
    |--------------------------------------------------------------------------
    |
    | If enabled, a proxy can add a X-UserId, X-Name and X-Email (header name specified down below) to the request and auto login or register
    | Make sure to only set this when behind a trusted proxy to prevent malicious
    |
    */
    'use_proxy_authentication' => env('VOVAMAIL_USE_PROXY_AUTHENTICATION', false),

    /*
    |--------------------------------------------------------------------------
    | Proxy authentication X-User header
    |--------------------------------------------------------------------------
    |
    | Header name for the username that the Proxy authentication uses to authenticate
    |
    */
    'proxy_authentication_external_user_id_header' => env('VOVAMAIL_PROXY_AUTHENTICATION_USER_ID_HEADER', 'X-User'),

    /*
    |--------------------------------------------------------------------------
    | Proxy authentication X-Name header
    |--------------------------------------------------------------------------
    |
    | Header name for the username that the Proxy authentication uses to authenticate
    |
    */
    'proxy_authentication_username_header' => env('VOVAMAIL_PROXY_AUTHENTICATION_NAME_HEADER', 'X-Name'),

    /*
    |--------------------------------------------------------------------------
    | Proxy authentication X-Email header
    |--------------------------------------------------------------------------
    |
    | Header name for the email that the Proxy authentication uses
    |
    */
    'proxy_authentication_email_header' => env('VOVAMAIL_PROXY_AUTHENTICATION_EMAIL_HEADER', 'X-Email'),

    /*
    |--------------------------------------------------------------------------
    | Username Blacklist & Word Lists
    |--------------------------------------------------------------------------
    |
    | Lists used for blacklisted usernames and random alias generation. Each can
    | be overridden via .env: set to a comma-separated list or the path to a PHP
    | file that returns an array (absolute path, or path relative to project base).
    |
    */

    'blacklist' => $resolveList('VOVAMAIL_BLACKLIST', __DIR__.'/lists/blacklist.php'),
    'male_first_names' => $resolveList('VOVAMAIL_MALE_FIRST_NAMES', __DIR__.'/lists/male_first.php'),
    'female_first_names' => $resolveList('VOVAMAIL_FEMALE_FIRST_NAMES', __DIR__.'/lists/female_first.php'),
    'surnames' => $resolveList('VOVAMAIL_SURNAMES', __DIR__.'/lists/surnames.php'),
    'wordlist' => $resolveList('VOVAMAIL_WORDLIST', __DIR__.'/lists/wordlist.php'),
    'adjectives' => $resolveList('VOVAMAIL_ADJECTIVES', __DIR__.'/lists/adjectives.php'),
    'nouns' => $resolveList('VOVAMAIL_NOUNS', __DIR__.'/lists/nouns.php'),
];
