@extends('layouts.auth')

@section('title', 'Reset password')

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
                        <h1 class="auth-title">Reset your password</h1>
                        <p class="auth-subtitle">Enter your username and we&apos;ll send a reset link to the inbox already connected to your account.</p>
                    </div>

                    <form method="POST" action="{{ route('password.email') }}">
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
                            <input id="username" type="text" class="auth-input{{ $errors->has('username') ? ' border-red-500' : '' }}" name="username" value="{{ old('username') }}" placeholder="johndoe" required>
                            <p class="auth-help">Use your VovaMail username here, not your email address.</p>

                            @if ($errors->has('username'))
                                <p class="auth-error">{{ $errors->first('username') }}</p>
                            @endif
                        </div>

                        <div class="mb-6">
                            <label for="captcha" class="auth-label">Human verification</label>
                            <div class="flex gap-2">
                                <img src="{{ captcha_src('mini') }}" onclick="this.src='/captcha/mini?'+Math.random()" class="h-12 w-16 shrink-0 cursor-pointer rounded border border-grey-700" title="Click to refresh image" alt="captcha">
                                <input id="captcha" type="text" class="auth-input flex-1{{ $errors->has('captcha') ? ' border-red-500' : '' }}" name="captcha" placeholder="Enter the text you see" required>
                            </div>
                            <p class="auth-help">Click the image if you need a fresh challenge.</p>

                            @if ($errors->has('captcha'))
                                <p class="auth-error">{{ $errors->first('captcha') }}</p>
                            @endif
                        </div>

                        <button type="submit" class="auth-button">
                            Send reset link
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
