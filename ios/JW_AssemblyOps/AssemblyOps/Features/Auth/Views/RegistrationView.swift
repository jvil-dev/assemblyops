//
//  RegistrationView.swift
//  AssemblyOps
//
//  Created by Jorge Villeda on 2/24/26.
//

// MARK: - Registration View
//
// Unified account creation for all users (overseers and volunteers).
// Replaces OverseerRegistrationView.
//
// Fields:
//   - First/Last Name (required)
//   - Email, Password, Confirm Password (required)
//   - Phone, Congregation (optional)
//   - Appointment Status picker (optional)
//
// Features:
//   - Password match indicator
//   - Google/Apple sign-up

import AuthenticationServices
import SwiftUI

struct RegistrationView: View {
    @StateObject private var viewModel = RegistrationViewModel()
    @Environment(\.colorScheme) var colorScheme
    @FocusState private var focusedField: Field?
    @State private var hasAppeared = false
    @State private var showError = false

    private enum Field: Hashable {
        case firstName, lastName, email, password, confirmPassword, phone
    }

    var body: some View {
        ScrollView {
            VStack(spacing: AppTheme.Spacing.xl) {
                nameCard
                    .entranceAnimation(hasAppeared: hasAppeared, delay: 0)

                credentialsCard
                    .entranceAnimation(hasAppeared: hasAppeared, delay: 0.05)

                optionalCard
                    .entranceAnimation(hasAppeared: hasAppeared, delay: 0.1)

                oauthSection
                    .entranceAnimation(hasAppeared: hasAppeared, delay: 0.15)

                registerButton
                    .entranceAnimation(hasAppeared: hasAppeared, delay: 0.2)

                termsCaption
                    .entranceAnimation(hasAppeared: hasAppeared, delay: 0.25)
            }
            .screenPadding()
            .padding(.top, AppTheme.Spacing.l)
            .padding(.bottom, AppTheme.Spacing.xxl)
        }
        .themedBackground(scheme: colorScheme)
        .navigationTitle("auth.createAccount".localized)
        .navigationBarTitleDisplayMode(.inline)
        .scrollDismissesKeyboard(.interactively)
        .onAppear {
            withAnimation(AppTheme.entranceAnimation) { hasAppeared = true }
        }
        .onChange(of: viewModel.errorMessage) { _, error in
            showError = error != nil
        }
        .alert("auth.registrationFailed".localized, isPresented: $showError) {
            Button("common.ok".localized) { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .sheet(isPresented: $viewModel.showOAuthRegistration) {
            if let data = viewModel.pendingOAuthData {
                OAuthRegistrationView(
                    email: data.email,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    pendingOAuthToken: data.pendingToken
                )
            }
        }
    }

    // MARK: - Name Card

    private var nameCard: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.l) {
            HStack(spacing: AppTheme.Spacing.s) {
                Image(systemName: "person.fill")
                    .font(.system(size: 11))
                    .foregroundStyle(AppTheme.themeColor)
                Text("auth.section.yourName".localized)
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(0.6)
                    .foregroundStyle(AppTheme.textTertiary(for: colorScheme))
            }

            HStack(spacing: AppTheme.Spacing.l) {
                UnderlineTextField(
                    label: "auth.field.firstName".localized,
                    placeholder: "auth.placeholder.firstName".localized,
                    text: $viewModel.firstName,
                    isSecure: false,
                    isFocused: focusedField == .firstName,
                    onSubmit: { focusedField = .lastName },
                    autocapitalization: .words,
                    keyboardType: .default,
                    isMonospaced: false
                )
                .focused($focusedField, equals: .firstName)

                UnderlineTextField(
                    label: "auth.field.lastName".localized,
                    placeholder: "auth.placeholder.lastName".localized,
                    text: $viewModel.lastName,
                    isSecure: false,
                    isFocused: focusedField == .lastName,
                    onSubmit: { focusedField = .email },
                    autocapitalization: .words,
                    keyboardType: .default,
                    isMonospaced: false
                )
                .focused($focusedField, equals: .lastName)
            }
        }
        .cardPadding()
        .themedCard(scheme: colorScheme)
    }

    // MARK: - Credentials Card

    private var credentialsCard: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.l) {
            HStack(spacing: AppTheme.Spacing.s) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 11))
                    .foregroundStyle(AppTheme.themeColor)
                Text("auth.section.credentials".localized)
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(0.6)
                    .foregroundStyle(AppTheme.textTertiary(for: colorScheme))
            }

            UnderlineTextField(
                label: "auth.field.email".localized,
                placeholder: "auth.placeholder.email".localized,
                text: $viewModel.email,
                isSecure: false,
                isFocused: focusedField == .email,
                onSubmit: { focusedField = .password },
                autocapitalization: .never,
                keyboardType: .emailAddress,
                isMonospaced: false
            )
            .focused($focusedField, equals: .email)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()

            UnderlineTextField(
                label: "auth.field.password".localized,
                placeholder: "auth.placeholder.password".localized,
                text: $viewModel.password,
                isSecure: true,
                isFocused: focusedField == .password,
                onSubmit: { focusedField = .confirmPassword },
                autocapitalization: .never,
                keyboardType: .default,
                isMonospaced: false
            )
            .focused($focusedField, equals: .password)

            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                UnderlineTextField(
                    label: "auth.field.confirmPassword".localized,
                    placeholder: "auth.placeholder.confirmPassword".localized,
                    text: $viewModel.confirmPassword,
                    isSecure: true,
                    isFocused: focusedField == .confirmPassword,
                    onSubmit: { focusedField = .phone },
                    autocapitalization: .never,
                    keyboardType: .default,
                    isMonospaced: false
                )
                .focused($focusedField, equals: .confirmPassword)

                if !viewModel.confirmPassword.isEmpty {
                    HStack(spacing: 4) {
                        Image(
                            systemName: viewModel.passwordsMatch
                                ? "checkmark.circle.fill" : "xmark.circle.fill"
                        )
                        .font(.caption)
                        Text(
                            viewModel.passwordsMatch
                                ? "auth.passwordsMatch".localized
                                : "auth.passwordsDontMatch".localized
                        )
                        .font(.caption)
                    }
                    .foregroundStyle(
                        viewModel.passwordsMatch
                            ? AppTheme.StatusColors.accepted
                            : AppTheme.StatusColors.declined
                    )
                    .transition(.opacity)
                }
            }

            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                Text("auth.section.congregation".localized)
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(0.6)
                    .foregroundStyle(AppTheme.textTertiary(for: colorScheme))

                CongregationSearchField(
                    selectedName: $viewModel.congregationName,
                    selectedId: $viewModel.congregationId
                )
            }
        }
        .cardPadding()
        .themedCard(scheme: colorScheme)
    }

    // MARK: - Optional Fields Card

    private var optionalCard: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.l) {
            HStack(spacing: AppTheme.Spacing.s) {
                Image(systemName: "info.circle")
                    .font(.system(size: 11))
                    .foregroundStyle(AppTheme.themeColor)
                Text("auth.section.optionalInfo".localized)
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(0.6)
                    .foregroundStyle(AppTheme.textTertiary(for: colorScheme))
            }

            UnderlineTextField(
                label: "auth.field.phone".localized,
                placeholder: "auth.placeholder.phone".localized,
                text: $viewModel.phone,
                isSecure: false,
                isFocused: focusedField == .phone,
                onSubmit: { focusedField = nil },
                autocapitalization: .never,
                keyboardType: .phonePad,
                isMonospaced: false
            )
            .focused($focusedField, equals: .phone)

            VStack(alignment: .leading, spacing: AppTheme.Spacing.s) {
                Text("auth.section.appointment".localized)
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(0.6)
                    .foregroundStyle(AppTheme.textTertiary(for: colorScheme))

                Picker(
                    "auth.section.appointment".localized,
                    selection: $viewModel.appointmentStatus
                ) {
                    Text("auth.appointment.none".localized).tag(String?.none)
                    Text("auth.appointment.publisher".localized).tag(
                        String?.some("PUBLISHER")
                    )
                    Text("auth.appointment.ministerialServant".localized).tag(
                        String?.some("MINISTERIAL_SERVANT")
                    )
                    Text("auth.appointment.elder".localized).tag(
                        String?.some("ELDER")
                    )
                }
                .pickerStyle(.menu)
                .tint(AppTheme.themeColor)
            }
        }
        .cardPadding()
        .themedCard(scheme: colorScheme)
    }

    // MARK: - OAuth

    private var oauthSection: some View {
        VStack(spacing: AppTheme.Spacing.m) {
            HStack {
                Rectangle()
                    .fill(AppTheme.dividerColor(for: colorScheme))
                    .frame(height: 1)
                Text("auth.orSignUpWith".localized)
                    .font(AppTheme.Typography.caption)
                    .foregroundStyle(AppTheme.textTertiary(for: colorScheme))
                    .fixedSize()
                Rectangle()
                    .fill(AppTheme.dividerColor(for: colorScheme))
                    .frame(height: 1)
            }

            HStack(spacing: AppTheme.Spacing.m) {
                Button {
                    viewModel.signInWithGoogle()
                } label: {
                    HStack(spacing: AppTheme.Spacing.s) {
                        Text("G")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(AppTheme.googleBlue)
                        Text("Google").font(AppTheme.Typography.body)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: AppTheme.ButtonHeight.medium)
                }
                .background(
                    RoundedRectangle(cornerRadius: AppTheme.CornerRadius.button)
                        .stroke(
                            AppTheme.dividerColor(for: colorScheme),
                            lineWidth: 1.5
                        )
                )
                .foregroundStyle(AppTheme.textSecondary(for: colorScheme))
                .accessibilityLabel("auth.a11y.signUpGoogle".localized)

                Button {
                    viewModel.signInWithApple()
                } label: {
                    HStack(spacing: AppTheme.Spacing.s) {
                        Image(systemName: "apple.logo").font(.system(size: 17))
                        Text("Apple").font(AppTheme.Typography.body)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: AppTheme.ButtonHeight.medium)
                }
                .background(
                    RoundedRectangle(cornerRadius: AppTheme.CornerRadius.button)
                        .stroke(
                            AppTheme.dividerColor(for: colorScheme),
                            lineWidth: 1.5
                        )
                )
                .foregroundStyle(AppTheme.textSecondary(for: colorScheme))
                .accessibilityLabel("auth.a11y.signUpApple".localized)
            }
        }
    }

    // MARK: - Register Button

    private var registerButton: some View {
        Button {
            focusedField = nil
            viewModel.register()
        } label: {
            Group {
                if viewModel.isLoading {
                    ProgressView().tint(.white)
                } else {
                    Text("auth.createAccount".localized)
                        .font(AppTheme.Typography.bodyMedium)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: AppTheme.ButtonHeight.large)
        }
        .background(
            RoundedRectangle(cornerRadius: AppTheme.CornerRadius.button)
                .fill(
                    viewModel.isFormValid
                        ? AppTheme.themeColor
                        : AppTheme.themeColor.opacity(0.4)
                )
                .shadow(
                    color: AppTheme.themeColor.opacity(
                        viewModel.isFormValid ? 0.3 : 0
                    ),
                    radius: 10,
                    x: 0,
                    y: 3
                )
        )
        .foregroundStyle(.white)
        .disabled(!viewModel.isFormValid || viewModel.isLoading)
        .animation(AppTheme.quickAnimation, value: viewModel.isFormValid)
    }

    // MARK: - Terms

    private var termsCaption: some View {
        Text("auth.termsAgreement".localized)
            .font(.footnote)
            .foregroundStyle(AppTheme.textTertiary(for: colorScheme))
            .multilineTextAlignment(.center)
            .padding(.bottom, AppTheme.Spacing.s)
    }
}

#Preview {
    NavigationStack {
        RegistrationView()
    }
}
