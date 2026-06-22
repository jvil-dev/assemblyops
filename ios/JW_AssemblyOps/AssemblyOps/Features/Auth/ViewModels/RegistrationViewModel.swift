//
//  RegistrationViewModel.swift
//  AssemblyOps
//
//  Created by Jorge Villeda on 2/24/26.
//

// MARK: - Registration View Model
//
// Handles new account creation for all users (overseers and volunteers).
// Replaces OverseerRegistrationViewModel.
//
// Properties:
//   - email/password/confirmPassword: Credential fields
//   - firstName/lastName: Required name fields
//   - phone/congregation: Optional profile fields
//   - appointmentStatus: Optional publisher/MS/elder
//   - isLoading: True during registration request
//   - errorMessage: User-facing error text
//   - showOAuthRegistration: Triggers OAuthRegistrationView
//   - pendingOAuthData: Temporary data for OAuth new users
//
// Validation:
//   - Email non-empty, password 8+ chars, passwords match, name non-empty
//
// Methods:
//   - register(): Create account via registerUser mutation
//   - signInWithGoogle()/signInWithApple(): OAuth registration flows

import Foundation
import Combine
import Apollo
import AuthenticationServices

@MainActor
final class RegistrationViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var confirmPassword = ""
    @Published var firstName = ""
    @Published var lastName = ""
    @Published var phone = ""
    @Published var congregationName = ""  // display name set by CongregationSearchField
    @Published var congregationId: String? = nil  // DB id set on selection
    @Published var appointmentStatus: String? = nil
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var showOAuthRegistration: Bool = false
    @Published var pendingOAuthData: PendingOAuthData?

    struct PendingOAuthData {
        let pendingToken: String
        let email: String
        let firstName: String
        let lastName: String
    }

    private let appState = AppState.shared

    var isFormValid: Bool {
        !email.trimmingCharacters(in: .whitespaces).isEmpty &&
        password.count >= 8 &&
        password == confirmPassword &&
        !firstName.trimmingCharacters(in: .whitespaces).isEmpty &&
        !lastName.trimmingCharacters(in: .whitespaces).isEmpty &&
        congregationId != nil
    }

    var passwordsMatch: Bool {
        confirmPassword.isEmpty || password == confirmPassword
    }

    var passwordStrengthMet: Bool {
        password.count >= 8
    }

    // MARK: - Registration

    func register() {
        guard isFormValid else { return }
        isLoading = true
        errorMessage = nil

        let appointmentStatusEnum: GraphQLNullable<GraphQLEnum<AssemblyOpsAPI.AppointmentStatus>>
        if let status = appointmentStatus,
           let enumValue = AssemblyOpsAPI.AppointmentStatus(rawValue: status) {
            appointmentStatusEnum = .some(.case(enumValue))
        } else {
            appointmentStatusEnum = .none
        }

        let phoneValue: GraphQLNullable<String> = phone.trimmingCharacters(in: .whitespaces).isEmpty
            ? .none : .some(phone.trimmingCharacters(in: .whitespaces))
        let congregationValue: GraphQLNullable<String> = congregationName.trimmingCharacters(in: .whitespaces).isEmpty
            ? .none : .some(congregationName.trimmingCharacters(in: .whitespaces))
        let congregationIdValue: GraphQLNullable<AssemblyOpsAPI.ID> = congregationId.map { .some($0) } ?? .none

        let input = AssemblyOpsAPI.RegisterUserInput(
            email: email.lowercased().trimmingCharacters(in: .whitespaces),
            password: password,
            firstName: firstName.trimmingCharacters(in: .whitespaces),
            lastName: lastName.trimmingCharacters(in: .whitespaces),
            phone: phoneValue,
            congregation: congregationValue,
            congregationId: congregationIdValue,
            appointmentStatus: appointmentStatusEnum,
            isOverseer: .none
        )

        NetworkClient.shared.apollo.perform(
            mutation: AssemblyOpsAPI.RegisterUserMutation(input: input)
        ) { [weak self] result in
            Task { @MainActor in
                switch result {
                case .success(let graphQLResult):
                    if let data = graphQLResult.data?.registerUser {
                        let user = UserInfo(
                            id: data.user.id,
                            userId: data.user.userId,
                            email: data.user.email,
                            firstName: data.user.firstName,
                            lastName: data.user.lastName,
                            fullName: data.user.fullName,
                            phone: data.user.phone,
                            congregation: data.user.congregation,
                            congregationId: data.user.congregationId,
                            circuitCode: data.user.congregationRef?.circuit.code,
                            circuitId: data.user.congregationRef?.circuit.id,
                            appointmentStatus: data.user.appointmentStatus?.rawValue,
                            isOverseer: data.user.isOverseer
                        )
                        HapticManager.shared.success()
                        self?.appState.didLogin(
                            user: user,
                            accessToken: data.accessToken,
                            refreshToken: data.refreshToken,
                            expiresIn: data.expiresIn
                        )
                    } else if let errors = graphQLResult.errors, !errors.isEmpty {
                        let firstError = errors.first
                        let code = (firstError?.extensions?["code"] as? String)
                        if code == "CONFLICT" {
                            self?.errorMessage = NSLocalizedString("auth.duplicate.email", comment: "")
                                + " " + NSLocalizedString("auth.duplicate.trySignIn", comment: "")
                        } else {
                            self?.errorMessage = firstError?.message ?? NSLocalizedString("auth.registrationFailed", comment: "")
                        }
                        HapticManager.shared.error()
                    }
                case .failure:
                    self?.errorMessage = "Unable to connect. Please try again."
                    HapticManager.shared.error()
                }
                self?.isLoading = false
            }
        }
    }

    // MARK: - OAuth

    func signInWithGoogle() {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootVC = scene.windows.first?.rootViewController else { return }
        Task {
            isLoading = true
            errorMessage = nil
            do {
                let idToken = try await OAuthService.shared.signInWithGoogle(presenting: rootVC)
                handleGoogleLogin(idToken: idToken)
            } catch {
                if (error as NSError).code != -5 {
                    errorMessage = "Google sign-in failed"
                }
                isLoading = false
            }
        }
    }

    func signInWithApple() {
        Task {
            isLoading = true
            errorMessage = nil
            do {
                let result = try await OAuthService.shared.signInWithApple()
                handleAppleLogin(result: result)
            } catch let error as ASAuthorizationError where error.code == .canceled {
                isLoading = false
            } catch {
                errorMessage = "Apple sign-in failed"
                isLoading = false
            }
        }
    }

    private func handleGoogleLogin(idToken: String) {
        NetworkClient.shared.apollo.perform(
            mutation: AssemblyOpsAPI.LoginWithGoogleMutation(
                input: AssemblyOpsAPI.GoogleAuthInput(idToken: idToken)
            )
        ) { [weak self] result in
            Task { @MainActor in
                switch result {
                case .success(let graphQLResult):
                    if let data = graphQLResult.data?.loginWithGoogle {
                        self?.processOAuthResponse(
                            isNewUser: data.isNewUser,
                            accessToken: data.accessToken,
                            refreshToken: data.refreshToken,
                            expiresIn: data.expiresIn,
                            pendingOAuthToken: data.pendingOAuthToken,
                            email: data.email,
                            firstName: data.firstName ?? "",
                            lastName: data.lastName ?? ""
                        )
                    } else if let errors = graphQLResult.errors, !errors.isEmpty {
                        self?.errorMessage = errors.first?.message ?? "Sign-in failed"
                    }
                case .failure:
                    self?.errorMessage = "Unable to connect. Please try again."
                }
                self?.isLoading = false
            }
        }
    }

    private func handleAppleLogin(result: OAuthService.AppleAuthResult) {
        let input = AssemblyOpsAPI.AppleAuthInput(
            identityToken: result.identityToken,
            firstName: result.firstName.map { .some($0) } ?? .none,
            lastName: result.lastName.map { .some($0) } ?? .none
        )
        NetworkClient.shared.apollo.perform(
            mutation: AssemblyOpsAPI.LoginWithAppleMutation(input: input)
        ) { [weak self] result in
            Task { @MainActor in
                switch result {
                case .success(let graphQLResult):
                    if let data = graphQLResult.data?.loginWithApple {
                        self?.processOAuthResponse(
                            isNewUser: data.isNewUser,
                            accessToken: data.accessToken,
                            refreshToken: data.refreshToken,
                            expiresIn: data.expiresIn,
                            pendingOAuthToken: data.pendingOAuthToken,
                            email: data.email,
                            firstName: data.firstName ?? "",
                            lastName: data.lastName ?? ""
                        )
                    } else if let errors = graphQLResult.errors, !errors.isEmpty {
                        self?.errorMessage = errors.first?.message ?? "Sign-in failed"
                    }
                case .failure:
                    self?.errorMessage = "Unable to connect. Please try again."
                }
                self?.isLoading = false
            }
        }
    }

    private func processOAuthResponse(
        isNewUser: Bool,
        accessToken: String?,
        refreshToken: String?,
        expiresIn: Int?,
        pendingOAuthToken: String?,
        email: String,
        firstName: String,
        lastName: String
    ) {
        // For registration flow, always treat as new user needing profile completion
        pendingOAuthData = PendingOAuthData(
            pendingToken: pendingOAuthToken ?? "",
            email: email,
            firstName: firstName,
            lastName: lastName
        )
        showOAuthRegistration = true
    }
}
