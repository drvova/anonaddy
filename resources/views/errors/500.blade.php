@extends('layouts.auth')

@section('title', 'Server error')

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
                                <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.032 4.032c.18.18.287.412.287.66V15.75c0 .414-.336.75-.75.75a.75.75 0 01-.75-.75v-5.25c0-.207-.143-.39-.353-.462L8.25 9.15V5.25m0 0L12 1.5m-3.75 3.75L12 5.25" />
                            </svg>
                        </div>
                        <h1 class="auth-title">Server error</h1>
                        <p class="auth-subtitle">Something went wrong on our end. We are working to fix it. Please try again in a moment.</p>
                    </div>

                    <div class="flex flex-col gap-3">
                        <button onclick="window.location.reload()" class="auth-button">
                            Refresh page
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
