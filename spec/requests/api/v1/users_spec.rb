require 'rails_helper'

RSpec.describe Api::V1::UsersController, type: :request do

  describe "POST /api/v1/register" do
    context "with valid parameters" do
      it "creates a new user and logs them in" do
        expect do
          post api_v1_users_path, params: { user: { email_address: "test@example.com", password: "password", password_confirmation: "password" } }, as: :json
        end.to change(User, :count).by(1)
        expect(response).to have_http_status(:created)
        expect(response.parsed_body["message"]).to eq("Registration successful")
        expect(response.parsed_body["user"]["email_address"]).to eq("test@example.com")
        expect(session[:session_id]).to be_present
      end
    end

    context "with invalid parameters" do
      it "does not create a new user with invalid email" do
        expect do
          post api_v1_users_path, params: { user: { email_address: "invalid", password: "password", password_confirmation: "password" } }, as: :json
        end.to_not change(User, :count)
        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.parsed_body["errors"]).to include("Email address is not an email")
      end

      it "does not create a new user with mismatched passwords" do
        expect do
          post api_v1_users_path, params: { user: { email_address: "test2@example.com", password: "password", password_confirmation: "mismatched" } }, as: :json
        end.to_not change(User, :count)
        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.parsed_body["errors"]).to include("Password confirmation doesn't match Password")
      end

      it "does not create a new user with duplicate email" do
        create(:user, email_address: "existing@example.com")
        expect do
          post api_v1_users_path, params: { user: { email_address: "existing@example.com", password: "password", password_confirmation: "password" } }, as: :json
        end.to_not change(User, :count)
        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.parsed_body["errors"]).to include("Email address has already been taken")
      end
    end
  end

  describe "GET /api/v1/me" do
    context "when logged in" do
      let!(:user) { create(:user) }
      let(:login_response_cookies) { {} } # ログイン後のクッキーを保持するハッシュ

      before do
        # ログイン処理
        post api_v1_auth_path, params: { email_address: user.email_address, password: user.password }, as: :json
        expect(response).to have_http_status(:ok)
        expect(response.cookies["session_id"]).to be_present # クッキーからsession_idを確認
        login_response_cookies.merge!(response.cookies) # ログイン後のクッキーを保存
      end

      it "returns the current user's information" do
        # ログイン後のクッキーを使用して`me`エンドポイントにアクセス
        get api_v1_me_path, headers: { "Cookie" => login_response_cookies.map { |k, v| "#{k}=#{v}" }.join(";") }, as: :json
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["user"]["id"]).to eq(user.id)
        expect(response.parsed_body["user"]["email_address"]).to eq(user.email_address)
      end
    end

    context "when not logged in" do
      it "returns an unauthorized error" do
        get api_v1_me_path, as: :json
        expect(response).to have_http_status(:unauthorized)
        expect(response.parsed_body["error"]).to eq("Unauthorized")
      end
    end
  end
end
