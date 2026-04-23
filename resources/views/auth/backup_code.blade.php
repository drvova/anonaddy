@extends('layouts.auth')

@section('title', 'Use a backup code')

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
                        <h1 class="auth-title">Use a backup code</h1>
                        <p class="auth-subtitle">Use one of your saved recovery codes to finish signing in when you can&apos;t reach your authenticator app.</p>
                    </div>

                    <div class="auth-alert auth-alert-warning" role="alert">
                        After you use a backup code, two-factor authentication will be disabled on your account. Re-enable it after signing in if you want to keep using 2FA.
                    </div>

                    <form method="POST" action="{{ route('login.backup_code.login') }}">
                        @csrf

                        <div class="mb-6">
                            <label for="backup_code" class="auth-label">Backup code</label>
                            <input id="backup_code" type="text" class="auth-input{{ $errors->has('backup_code') ? ' border-red-500' : '' }}" name="backup_code" placeholder="Enter your backup code" required autofocus>

                            @if ($errors->has('backup_code'))
                                <p class="auth-error">{{ $errors->first('backup_code') }}</p>
                            @endif
                        </div>

                        <button type="submit" class="auth-button">
                            Authenticate
                        </button>
                    </form>
                </div>

                <form action="{{ route('logout') }}" method="POST" class="auth-footer text-center lg:text-left">
                    {{ csrf_field() }}
                    <button type="submit" class="auth-muted-link cursor-pointer bg-transparent">Log out</button>
                </form>
            </div>
        </div>
    </div>
@endsection
