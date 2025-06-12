class Api::V1::UsersController < ApplicationController
  # 登録（ユーザー作成）は認証なしでアクセス可能
  skip_before_action :require_authentication, only: [:create]

  # 登録（ユーザー作成）
  def create
    user = User.new(user_params)

    if user.save
      start_new_session_for user # 登録後、自動的にログイン
      render json: { message: "Registration successful", user: user.as_json(only: [:id, :email_address]) }, status: :created
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # 現在のユーザー情報を取得
  def show
    if current_user
      render json: { user: current_user.as_json(only: [:id, :email_address]) }, status: :ok
    else
      render json: { error: "Not authenticated" }, status: :unauthorized
    end
  end

  private

  def user_params
    params.require(:user).permit(:email_address, :password, :password_confirmation)
  end
end
