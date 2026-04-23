<!doctype html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>VovaMail — Encrypted email aliases</title>

    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/site.webmanifest">
    <meta name="theme-color" content="#000000">
    <meta name="description" content="Private email aliases, custom domains, and delivery control for the inbox you actually use.">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&family=Uncut+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

    @vite('resources/css/app.css')

</head>
<body class="bg-black antialiased text-white font-sans selection:bg-primary/20 selection:text-primary">
    <div class="fixed inset-0 -z-20 bg-black"></div>
    <div class="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(102,255,176,0.08),transparent_28%),radial-gradient(circle_at_85%_15%,_rgba(116,121,234,0.08),transparent_24%)]"></div>
    <div class="fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.06] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"></div>

    <nav class="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-sm">
        <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            <a href="/" class="inline-flex items-center">
                <img src="/svg/logo.svg" alt="VovaMail" class="block h-6 w-auto">
            </a>

            <div class="flex items-center gap-5 text-sm">
                <a href="{{ route('login') }}" class="text-grey-400 transition hover:text-white">Sign in</a>
                @if (Route::has('register'))
                    <a href="{{ route('register') }}" class="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 font-medium text-primary transition hover:border-primary/50 hover:bg-primary/15">Create account</a>
                @endif
            </div>
        </div>
    </nav>

    <main>
        <section class="border-b border-white/10">
            <div class="mx-auto grid max-w-6xl gap-14 px-6 py-16 lg:grid-cols-[minmax(0,1.12fr)_420px] lg:py-24">
                <div>
                    <h1 class="max-w-4xl text-[clamp(3.1rem,7vw,6.25rem)] font-semibold leading-[0.94] tracking-[-0.065em] text-white">
                        Email aliases with a real kill switch.
                    </h1>

                    <p class="mt-7 max-w-2xl text-base leading-8 text-grey-300 lg:text-lg">
                        Create a different address for every signup, product, customer flow, or campaign. Keep your real inbox private, route mail through your own domain, and disable any alias the second it leaks.
                    </p>

                    <div class="mt-10 flex flex-wrap items-center gap-4">
                        @if (Route::has('register'))
                            <a href="{{ route('register') }}" class="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary/90">
                                Start with VovaMail
                            </a>
                        @endif
                        <a href="{{ route('login') }}" class="rounded-lg border border-white/10 px-5 py-3 text-sm font-medium text-grey-200 transition hover:border-white/20 hover:text-white">
                            Sign in
                        </a>
                    </div>

                    <div class="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-grey-400">
                        <span>Unlimited aliases</span>
                        <span>Custom domains</span>
                        <span>Encrypted forwarding</span>
                        <span>Reply and send flows</span>
                        <span>Managed mail infrastructure</span>
                    </div>
                </div>

                <div class="space-y-4">
                    <div class="rounded-xl border border-white/10 bg-grey-950/80 p-5">
                        <div class="flex items-center justify-between border-b border-white/10 pb-3 text-xs text-grey-500">
                            <span>Alias inventory</span>
                            <span>3 active / 1 disabled</span>
                        </div>
                        <div class="space-y-3 pt-4 text-sm">
                            <div class="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                                <div>
                                    <p class="font-medium text-white">billing@studio.example</p>
                                    <p class="mt-1 text-xs text-grey-500">Forwarding to finance@company.com</p>
                                </div>
                                <span class="text-xs text-primary">active</span>
                            </div>
                            <div class="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                                <div>
                                    <p class="font-medium text-white">launch@vovamail.xyz</p>
                                    <p class="mt-1 text-xs text-grey-500">Campaign alias with reply support enabled</p>
                                </div>
                                <span class="text-xs text-primary">active</span>
                            </div>
                            <div class="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                                <div>
                                    <p class="font-medium text-white">vendors@company.example</p>
                                    <p class="mt-1 text-xs text-grey-500">Custom-domain alias for procurement</p>
                                </div>
                                <span class="text-xs text-primary">active</span>
                            </div>
                            <div class="flex items-center justify-between gap-3 text-grey-500">
                                <div>
                                    <p class="font-medium line-through decoration-red-400/40">old-newsletter@vovamail.xyz</p>
                                    <p class="mt-1 text-xs">Disabled after a leak. Inbox untouched.</p>
                                </div>
                                <span class="text-xs text-red-300">off</span>
                            </div>
                        </div>
                    </div>

                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="rounded-xl border border-white/10 bg-grey-950/80 p-5">
                            <p class="text-sm font-medium text-white">Delivery visibility</p>
                            <p class="mt-2 text-sm leading-6 text-grey-400">Track outbound status, bounces, and failed deliveries instead of guessing whether a message ever landed.</p>
                        </div>
                        <div class="rounded-xl border border-white/10 bg-grey-950/80 p-5">
                            <p class="text-sm font-medium text-white">Custom-domain control</p>
                            <p class="mt-2 text-sm leading-6 text-grey-400">Keep aliases under your own domain while still separating every workflow, customer, and signup path.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="border-b border-white/10">
            <div class="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[300px_minmax(0,1fr)] lg:py-20">
                <div>
                    <h2 class="text-3xl font-semibold tracking-[-0.04em] text-white">Stop reusing your real address everywhere.</h2>
                </div>

                <div class="border-t border-white/10">
                    <div class="grid gap-3 border-b border-white/10 py-5 lg:grid-cols-[200px_minmax(0,1fr)]">
                        <p class="text-sm font-medium text-white">Create a different address per surface</p>
                        <p class="text-sm leading-7 text-grey-400">Give billing, hiring, support, newsletters, beta programs, and transactional vendors their own alias instead of funneling everything through one inbox forever.</p>
                    </div>
                    <div class="grid gap-3 border-b border-white/10 py-5 lg:grid-cols-[200px_minmax(0,1fr)]">
                        <p class="text-sm font-medium text-white">Cut off leaks without changing your inbox</p>
                        <p class="text-sm leading-7 text-grey-400">If one alias gets scraped, sold, or abused, disable only that address. Your real mailbox stays hidden and every other alias keeps working.</p>
                    </div>
                    <div class="grid gap-3 py-5 lg:grid-cols-[200px_minmax(0,1fr)]">
                        <p class="text-sm font-medium text-white">Keep routing and reply flows in one system</p>
                        <p class="text-sm leading-7 text-grey-400">Run forwarding, custom domains, encrypted recipients, and send-from or reply workflows from the same operational surface instead of stitching together inbox rules by hand.</p>
                    </div>
                </div>
            </div>
        </section>

        <section class="border-b border-white/10">
            <div class="mx-auto max-w-6xl px-6 py-16 lg:py-20">
                <div class="grid gap-10 lg:grid-cols-3">
                    <div>
                        <h2 class="text-3xl font-semibold tracking-[-0.04em] text-white">Built for personal inboxes, operators, and teams.</h2>
                    </div>
                    <div class="space-y-5 lg:col-span-2 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
                        <div class="border-t border-white/10 pt-4">
                            <p class="text-sm font-medium text-white">Personal privacy</p>
                            <p class="mt-2 text-sm leading-6 text-grey-400">Use a different alias for every service you sign up for and keep your private inbox out of third-party systems.</p>
                        </div>
                        <div class="border-t border-white/10 pt-4">
                            <p class="text-sm font-medium text-white">Founder and ops workflows</p>
                            <p class="mt-2 text-sm leading-6 text-grey-400">Route billing, product demos, hiring, and vendor communications through aliases that can be reassigned or disabled at any time.</p>
                        </div>
                        <div class="border-t border-white/10 pt-4">
                            <p class="text-sm font-medium text-white">Custom-domain mail surfaces</p>
                            <p class="mt-2 text-sm leading-6 text-grey-400">Keep your brand domain at the edge while VovaMail handles alias generation, delivery flow, and failed-delivery visibility behind it.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section>
            <div class="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 lg:flex-row lg:items-end lg:justify-between lg:py-20">
                <div class="max-w-2xl">
                    <h2 class="text-3xl font-semibold tracking-[-0.04em] text-white">Protect the inbox you already trust.</h2>
                    <p class="mt-3 text-sm leading-7 text-grey-400">Move signups, vendors, and customer workflows onto aliases you can control — without rebuilding your actual inbox every time one address leaks.</p>
                </div>
                <div class="flex flex-wrap gap-4">
                    @if (Route::has('register'))
                        <a href="{{ route('register') }}" class="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-black transition hover:bg-primary/90">Create account</a>
                    @endif
                    <a href="{{ route('login') }}" class="rounded-lg border border-white/10 px-5 py-3 text-sm font-medium text-grey-200 transition hover:border-white/20 hover:text-white">Sign in</a>
                </div>
            </div>
        </section>
    </main>

    <footer class="border-t border-white/10 py-8">
        <div class="mx-auto flex max-w-6xl flex-col gap-3 px-6 text-sm text-grey-500 sm:flex-row sm:items-center sm:justify-between">
            <span>&copy; {{ date('Y') }} VovaMail</span>
            <div class="flex items-center gap-5">
                <span>Private aliases</span>
                <span>Custom domains</span>
                <span>Managed routing</span>
            </div>
        </div>
    </footer>
</body>
</html>
