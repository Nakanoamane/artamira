class Api::V1::SessionsController < ApplicationController
  # APIモードでは不要
  # allow_unauthenticated_access only: %i[ new create ]
  # rate_limit to: 10, within: 3.minutes, only: :create, with: -> { redirect_to new_session_url, alert: "Try again later." }

  # `create` と `destroy` は認証なしでアクセス可能
  skip_before_action :require_authentication, only: [:create]

  # new アクションはAPIモードでは不要
  # def new
  # end

  def create
    user = User.authenticate_by(email_address: params[:email_address], password: params[:password])

    if user.present?
      start_new_session_for user
      render json: { message: "Login successful", user: user.as_json(only: [:id, :email_address]) }, status: :ok
    else
      render json: { error: "Invalid email address or password" }, status: :unauthorized
    end
  end

  def destroy
    terminate_session
    render json: { message: "Logout successful" }, status: :no_content
  end
end
