module AuthenticationHelpers
  def sign_in(user)
    post api_v1_login_path, params: { email_address: user.email_address, password: user.password }, as: :json
    expect(response).to have_http_status(:ok)
    response.cookies # ログイン後に設定されるクッキーを返す
  end

  def cookies_for_header(user)
    cookies = sign_in(user)
    cookies.map { |k, v| "#{k}=#{v}" }.join(';')
  end
end
