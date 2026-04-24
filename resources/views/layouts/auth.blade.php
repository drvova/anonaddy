<!doctype html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <meta name="csrf-token" content="{{ csrf_token() }}">

    @hasSection('title')
        <title>@yield('title') — VovaMail</title>
    @else
        <title>VovaMail</title>
    @endif

    <link rel="apple-touch-icon" href="/svg/icon-logo.svg">
    <link rel="icon" type="image/svg+xml" href="/svg/icon-logo.svg">
    <link rel="alternate icon" href="/svg/icon-logo.svg">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="mask-icon" href="/svg/icon-logo.svg" color="#66ffb0">
    <meta name="msapplication-TileColor" content="#da532c">
    <meta name="theme-color" content="#000000">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&family=Uncut+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

    @vite('resources/css/app.css')
    @yield('webauthn')
</head>
<body class="min-h-screen overflow-x-hidden bg-charcoal font-sans antialiased text-white">
    <div class="fixed inset-0 -z-20 bg-charcoal"></div>
    @yield('content')
</body>
</html>
