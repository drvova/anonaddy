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

    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#66ffb0">
    <meta name="msapplication-TileColor" content="#da532c">
    <meta name="theme-color" content="#000000">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&family=Uncut+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

    @vite('resources/css/app.css')
    @yield('webauthn')
</head>
<body class="min-h-screen overflow-x-hidden bg-black font-sans antialiased text-white">
    <div class="fixed inset-0 -z-20 bg-black"></div>
    <div class="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(102,255,176,0.08),transparent_28%),radial-gradient(circle_at_85%_15%,_rgba(116,121,234,0.08),transparent_24%)]"></div>
    <div class="fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.06] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"></div>
    @yield('content')
</body>
</html>
