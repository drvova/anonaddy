@extends('layouts.auth')

@section('title', 'Verify your sign in')

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
                        <h1 class="auth-title">Verify your sign in</h1>
                        <p class="auth-subtitle">Enter the code from your authenticator app to finish signing in and open your VovaMail workspace.</p>
                    </div>

                    <form method="POST" action="{{ route('login.2fa') }}">
                        @csrf

                        @if (session('status'))
                            <div class="auth-alert auth-alert-success" role="alert">
                                {{ session('status') }}
                            </div>
                        @endif

                        <div class="mb-6">
                            <label for="one_time_password" class="auth-label">One-time password</label>
                            <input id="one_time_password" type="text" class="auth-input text-center text-lg tracking-[0.35em]{{ $errors->has('message') ? ' border-red-500' : '' }}" name="one_time_password" placeholder="123456" autocomplete="one-time-code" required autofocus>

                            @if ($errors->has('message'))
                                <p class="auth-error">{{ $errors->first('message') }}</p>
                            @endif
                        </div>

                        <button type="submit" class="auth-button">
                            Verify
                        </button>
                    </form>
                </div>

                <div class="auth-footer flex items-center justify-between gap-4">
                    <form action="{{ route('logout') }}" method="POST">
                        {{ csrf_field() }}
                        <button type="submit" class="auth-muted-link cursor-pointer bg-transparent">Log out</button>
                    </form>
                    <a class="auth-link" href="{{ route('login.backup_code.index') }}">Use backup code</a>
                </div>
            </div>
        </div>
    </div>
@endsection
