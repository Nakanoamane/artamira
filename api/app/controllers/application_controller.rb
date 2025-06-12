class ApplicationController < ActionController::API
  include ActionController::Cookies
  include Authentication
  before_action :require_authentication

  rescue_from StandardError, with: :render_internal_server_error
  rescue_from ActionController::BadRequest, with: :render_bad_request
  rescue_from ActionController::UnknownFormat, with: :render_bad_request
  rescue_from ActionController::UnknownHttpMethod, with: :render_bad_request
  rescue_from ActionController::ParameterMissing, with: :render_bad_request
  rescue_from ActionController::InvalidAuthenticityToken, with: :render_unauthorized
  rescue_from ActionController::RoutingError, with: :render_not_found
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :render_bad_request
  rescue_from ActiveRecord::RecordNotUnique, with: :render_bad_request
  rescue_from ActiveModel::StrictValidationFailed, with: :render_bad_request
  rescue_from NotAuthenticatedError, with: :render_unauthorized

  private

  def render_not_found(exception)
    log_error(exception)
    render json: { error: "Not found", details: exception.message }, status: :not_found
  end

  def render_bad_request(exception)
    log_error(exception)
    render json: { error: "Bad request", details: exception.message }, status: :bad_request
  end

  def render_internal_server_error(exception)
    log_error(exception)
    error_message = Rails.env.production? ? "" : exception.message
    render json: { error: "Internal Server Error", details: error_message }, status: :internal_server_error
  end

  def render_unauthorized(exception)
    log_error(exception)
    render json: { error: "Unauthorized", details: exception.message }, status: :unauthorized
  end

  def log_error(exception)
    Rails.logger.error(exception.message)
    Rails.logger.error(exception.backtrace.join("\n"))
    Rails.logger.info("Request: #{request.method} #{request.path}")
    Rails.logger.info("Params: #{request.params.inspect}")
    Rails.logger.info("Headers: #{request.headers.inspect}")
    Rails.logger.info("User: #{current_user.inspect}") if current_user
    Rails.logger.info("Session: #{session.inspect}")
  end
end
