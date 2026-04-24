<!doctype html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>VovaMail</title>

    <link rel="apple-touch-icon" href="/svg/icon-logo.svg">
    <link rel="icon" type="image/svg+xml" href="/svg/icon-logo.svg">
    <link rel="alternate icon" href="/svg/icon-logo.svg">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="mask-icon" href="/svg/icon-logo.svg" color="#66ffb0">
    <meta name="msapplication-TileColor" content="#da532c">
    <meta name="theme-color" content="#000000">

    <!-- Scripts -->
    @vite('resources/js/app.tsx')
    @routes
    @inertiaHead
</head>
<body class="{{ $page['props']['user']['darkMode'] ? 'dark' : '' }}">
    @inertia
</body>
</html>
