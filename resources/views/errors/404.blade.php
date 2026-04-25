@extends('layouts.auth')

@section('title', 'Page not found')

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
                        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                        </div>
                        <h1 class="auth-title">Page not found</h1>
                        <p class="auth-subtitle">The page you are looking for does not exist or has been moved.</p>
                    </div>

                    <div class="flex flex-col gap-3">
                        <a href="{{ route('login') }}" class="auth-button text-center">
                            Go to dashboard
                        </a>
                        <button onclick="history.back()" class="auth-muted-link cursor-pointer bg-transparent py-2 text-center">
                            Go back
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
