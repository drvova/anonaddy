@extends('layouts.auth')

@section('title', 'Create account')

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
                        <h1 class="auth-title">Create your account</h1>
                        <p class="auth-subtitle">Set up your username, point aliases at your real inbox, and start separating every service from your personal address.</p>
                    </div>

                    <form method="POST" action="{{ route('register') }}">
                        @csrf

                        <div class="auth-input-group">
                            <label for="username" class="auth-label">Username</label>
                            <div class="flex overflow-hidden rounded-lg border border-grey-700 bg-grey-900{{ $errors->has('username') ? ' border-red-500' : '' }}">
                                <input id="username" type="text" class="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-white outline-none placeholder:text-grey-500 focus:ring-0" name="username" value="{{ old('username') }}" placeholder="johndoe" required autofocus>
                                <span class="inline-flex items-center border-l border-grey-700 px-3 text-sm text-grey-500 whitespace-nowrap">.{{ config('vovamail.domain') }}</span>
                            </div>
                            <p class="auth-help">Your aliases can use this namespace, like alias@<b>johndoe</b>.{{ config('vovamail.domain') }}.</p>

                            @if ($errors->has('username'))
                                <p class="auth-error">{{ $errors->first('username') }}</p>
                            @endif
                        </div>

                        <div class="auth-input-group">
                            <label for="email" class="auth-label">Your real email address</label>
                            <input id="email" type="email" class="auth-input{{ $errors->has('email') ? ' border-red-500' : '' }}" name="email" value="{{ old('email') }}" placeholder="johndoe@example.com" required>
                            <p class="auth-help">Forwarded mail lands here. This inbox stays private from the services you sign up for.</p>

                            @if ($errors->has('email'))
                                <p class="auth-error">{{ $errors->first('email') }}</p>
                            @endif
                        </div>

                        <div class="auth-input-group">
                            <label for="email-confirm" class="auth-label">Confirm email address</label>
                            <input id="email-confirm" type="email" class="auth-input" name="email_confirmation" value="{{ old('email_confirmation') }}" placeholder="johndoe@example.com" required>
                        </div>

                        <div class="auth-input-group">
                            <label for="password" class="auth-label">Password</label>
                            <input id="password" type="password" class="auth-input{{ $errors->has('password') ? ' border-red-500' : '' }}" name="password" placeholder="********" required>

                            @if ($errors->has('password'))
                                <p class="auth-error">{{ $errors->first('password') }}</p>
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
                            Create account
                        </button>
                    </form>
                </div>

                <p class="auth-footer text-center lg:text-left">
                    Already have an account? <a class="auth-link" href="{{ route('login') }}">Sign in</a>
                </p>
            </div>
        </div>
    </div>
@endsection
