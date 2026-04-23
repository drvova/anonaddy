@extends('layouts.auth')

@section('title', 'Sign in')

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
                        <h1 class="auth-title">Sign in</h1>
                        <p class="auth-subtitle">Access your aliases, routing rules, and delivery controls with your VovaMail username and password.</p>
                    </div>

                    <form method="POST" action="{{ route('login') }}">
                        @csrf

                        @if (session('status'))
                            <div class="auth-alert auth-alert-success" role="alert">
                                {{ session('status') }}
                            </div>
                        @endif

                        <div class="auth-input-group">
                            <div class="mb-2 flex items-center justify-between">
                                <label for="username" class="auth-label mb-0">Username</label>
                                <a class="auth-link text-xs" href="{{ route('username.reminder.show') }}">Forgot username?</a>
                            </div>
                            <input id="username" type="text" class="auth-input{{ $errors->has('username') ? ' border-red-500' : '' }}" name="username" value="{{ old('username') }}" placeholder="johndoe" required autofocus>
                            <p class="auth-help">Use your VovaMail username here, not your personal email address.</p>

                            @if ($errors->has('username'))
                                <p class="auth-error">{{ $errors->first('username') }}</p>
                            @endif
                            @if ($errors->has('id'))
                                <p class="auth-error">{{ $errors->first('id') }}</p>
                            @endif
                        </div>

                        <div class="auth-input-group">
                            <div class="mb-2 flex items-center justify-between">
                                <label for="password" class="auth-label mb-0">Password</label>
                                <a class="auth-link text-xs" href="{{ route('password.request') }}">Forgot password?</a>
                            </div>
                            <input id="password" type="password" class="auth-input{{ $errors->has('password') ? ' border-red-500' : '' }}" name="password" placeholder="********" required>

                            @if ($errors->has('password'))
                                <p class="auth-error">{{ $errors->first('password') }}</p>
                            @endif
                        </div>

                        <div class="mb-6 flex items-center">
                            <input type="checkbox" name="remember" id="remember" class="h-4 w-4 rounded border-grey-700 bg-grey-900 text-primary focus:ring-primary" {{ old('remember') ? 'checked' : '' }}>
                            <label class="ml-2 text-sm text-grey-400" for="remember">Remember me on this device</label>
                        </div>

                        <button type="submit" class="auth-button">
                            Sign in
                        </button>
                    </form>
                </div>

                @if (Route::has('register'))
                    <p class="auth-footer text-center lg:text-left">
                        Don&apos;t have an account? <a class="auth-link" href="{{ route('register') }}">Create one</a>
                    </p>
                @endif
            </div>
        </div>
    </div>
@endsection
