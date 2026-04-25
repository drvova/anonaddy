@extends('layouts.auth')

@section('title', 'Too many requests')

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
                        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>
                        <h1 class="auth-title">Too many requests</h1>
                        <p class="auth-subtitle">You have made too many requests recently. Please wait a moment and try again.</p>
                    </div>

                    <div class="flex flex-col gap-3">
                        <button onclick="window.location.reload()" class="auth-button">
                            Try again
                        </button>
                        <a href="{{ route('login') }}" class="auth-muted-link cursor-pointer bg-transparent py-2 text-center">
                            Go to dashboard
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
