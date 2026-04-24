@extends('layouts.auth')

@section('title', 'Choose a new password')

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
                        <h1 class="auth-title">Choose a new password</h1>
                        <p class="auth-subtitle">Set a new password for your account and get back to managing aliases without exposing your real inbox.</p>
                    </div>

                    <form method="POST" action="{{ route('password.update') }}">
                        @csrf
                        <input type="hidden" name="token" value="{{ $token }}">

                        <div class="auth-input-group">
                            <label for="username" class="auth-label">Username</label>
                            <input id="username" type="text" class="auth-input{{ $errors->has('username') ? ' border-red-500' : '' }}" name="username" value="{{ old('username', $username) }}" placeholder="johndoe" required autofocus>

                            @if ($errors->has('username'))
                                <p class="auth-error">{{ $errors->first('username') }}</p>
                            @endif
                        </div>

                        <div class="auth-input-group">
                            <label for="password" class="auth-label">New password</label>
                            <input id="password" type="password" class="auth-input{{ $errors->has('password') ? ' border-red-500' : '' }}" name="password" placeholder="********" required>

                            @if ($errors->has('password'))
                                <p class="auth-error">{{ $errors->first('password') }}</p>
                            @endif
                        </div>

                        <div class="mb-6">
                            <label for="password-confirm" class="auth-label">Confirm new password</label>
                            <input id="password-confirm" type="password" class="auth-input" name="password_confirmation" placeholder="********" required>
                        </div>

                        <button type="submit" class="auth-button">
                            Reset password
                        </button>
                    </form>
                </div>

                <p class="auth-footer text-center lg:text-left">
                    <a class="auth-link" href="{{ route('login') }}">Back to sign in</a>
                </p>
            </div>
        </div>
    </div>
@endsection
