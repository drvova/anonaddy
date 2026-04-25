@extends('layouts.auth')

@section('title', 'Service unavailable')

@section('content')
    <div class="auth-shell">
        <div class="auth-grid">
            <div>
                @include('auth.partials.brand')
                @include('auth.partials.aside')
            </div>

            <div>
                <div class="auth-panel">
                    <div class="auth-panel-header">
                        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-grey-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-grey-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M11.412 15.655L9.75 21.75l3.745-4.012M9.257 13.5H3.75l2.659-2.849m2.048-2.194L14.25 2.25 12 10.5h8.25l-4.707 5.155" />
                            </svg>
                        </div>
                        <h1 class="auth-title">Service unavailable</h1>
                        <p class="auth-subtitle">VovaMail is temporarily down for maintenance. We will be back shortly.</p>
                    </div>

                    <div class="flex flex-col gap-3">
                        <button onclick="window.location.reload()" class="auth-button">
                            Check again
                        </button>
                        <a href="https://status.vovamail.xyz" target="_blank" class="auth-muted-link cursor-pointer bg-transparent py-2 text-center">
                            View status page
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
