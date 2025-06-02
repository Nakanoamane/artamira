require 'rails_helper'

RSpec.describe Api::V1::SessionsController, type: :request do

  describe "POST /api/v1/login" do
    let!(:user) { create(:user, email_address: "login@example.com", password: "password") }

    context "with valid credentials" do
      it "logs in the user" do
        post api_v1_auth_path, params: { email_address: "login@example.com", password: "password" }, as: :json
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["message"]).to eq("Login successful")
        expect(response.parsed_body["user"]["email_address"]).to eq("login@example.com")
        expect(session[:session_id]).to be_present
      end
    end

    context "with invalid credentials" do
      it "does not log in the user with wrong password" do
        post api_v1_auth_path, params: { email_address: "login@example.com", password: "wrong_password" }, as: :json
        expect(response).to have_http_status(:unauthorized)
        expect(response.parsed_body["error"]).to eq("Invalid email address or password")
        expect(session[:session_id]).to be_nil
      end

      it "does not log in the user with non-existent email" do
        post api_v1_auth_path, params: { email_address: "nonexistent@example.com", password: "password" }, as: :json
        expect(response).to have_http_status(:unauthorized)
        expect(response.parsed_body["error"]).to eq("Invalid email address or password")
        expect(session[:session_id]).to be_nil
      end
    end
  end

  describe "DELETE /api/v1/logout" do
    let!(:user) { create(:user) }
    let(:login_response_cookies) { {} } # ログイン後のクッキーを保持するハッシュ

    before do
      # ログイン処理
      post api_v1_auth_path, params: { email_address: user.email_address, password: user.password }, as: :json
      expect(response).to have_http_status(:ok)
      expect(response.cookies["session_id"]).to be_present # クッキーから_app_sessionを確認
      login_response_cookies.merge!(response.cookies) # ログイン後のクッキーを保存
    end

    context "when logged in" do
      it "logs out the user" do
        # ログアウト時にログイン後のクッキーを使用
        delete api_v1_auth_path, headers: { "Cookie" => login_response_cookies.map { |k, v| "#{k}=#{v}" }.join(";") }, as: :json
        expect(response).to have_http_status(:no_content)
        expect(response.cookies["session_id"]).to be_nil # クッキーから_app_sessionが削除されていることを確認
      end
    end

    context "when not logged in" do
      it "returns no error (idempotent)" do
        delete api_v1_auth_path,  headers: { "Cookie" => "" }, as: :json
        expect(response).to have_http_status(:unauthorized)
        expect(session[:session_id]).to be_nil
      end
    end
  end
end
