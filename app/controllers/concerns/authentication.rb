module Authentication
  extend ActiveSupport::Concern

  included do
    # before_action :require_authentication # APIモードでは各コントローラーで明示的に呼び出すか、ApplicationControllerで制御
    helper_method :authenticated?, :current_user

    # 認証失敗時のハンドリングをJSONレスポンスに変更
    rescue_from Authentication::NotAuthenticatedError, with: :not_authenticated
  end

  class_methods do
    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
    end
  end

  # NotAuthenticatedError を定義
  class NotAuthenticatedError < StandardError; end

  private
    def authenticated?
      resume_session
    end

    def current_user
      Current.session&.user
    end

    def require_authentication
      # セッションが存在しない場合、例外を発生させる
      resume_session || raise(NotAuthenticatedError)
    end

    def resume_session
      Current.session ||= find_session_by_cookie
    end

    def find_session_by_cookie
      Session.find_by(id: cookies.signed[:session_id]) if cookies.signed[:session_id]
    end

    # APIモードではリダイレクトしない
    # def request_authentication
    #   session[:return_to_after_authenticating] = request.url
    #   redirect_to new_session_path
    # end

    # def after_authentication_url
    #   session.delete(:return_to_after_authenticating) || root_url
    # end

    def start_new_session_for(user)
      user.sessions.create!(user_agent: request.user_agent, ip_address: request.remote_ip).tap do |session_record|
        Current.session = session_record
        cookies.signed.permanent[:session_id] = { value: session_record.id, httponly: true, same_site: :lax }
        session[:session_id] = session_record.id # 明示的にsessionハッシュに設定
      end
    end

    def terminate_session
      Current.session.destroy
      cookies.delete(:session_id)
      session.delete(:session_id)
    end

    # 認証失敗時のJSONレスポンス
    def not_authenticated
      render json: { error: "Not authenticated" }, status: :unauthorized
    end
end
