module Api
  module V1
    class DrawingsController < ApplicationController
      before_action :set_drawing, only: [:show, :update, :destroy, :save, :export]

      def index
        @drawings = Drawing.all
        render json: @drawings
      end

      def show
        render json: @drawing
      end

      def create
        @drawing = Drawing.new(drawing_params)

        if @drawing.save
          render json: @drawing, status: :created
        else
          render json: @drawing.errors, status: :unprocessable_entity
        end
      end

      def update
        if @drawing.update(drawing_params)
          render json: @drawing
        else
          render json: @drawing.errors, status: :unprocessable_entity
        end
      end

      def destroy
        @drawing.destroy
        head :no_content
      end

      def save
        if @drawing.update(last_saved_at: Time.current)
          ActionCable.server.broadcast "drawing_#{@drawing.id}", {
            type: 'drawing_saved',
            drawing_id: @drawing.id,
            last_saved_at: @drawing.last_saved_at
          }
          render json: { status: "success", message: "Drawing saved successfully.", last_saved_at: @drawing.last_saved_at }, status: :ok
        else
          render json: @drawing.errors, status: :unprocessable_entity
        end
      end

      def export
        format = params[:format].to_s.downcase
        image_data_url = params[:image_data]

        unless ['png', 'jpeg'].include?(format) && image_data_url.present?
          render json: { error: 'Invalid format or missing image_data.' }, status: :bad_request
          return
        end

        base66_data = image_data_url.split(',').last

        unless base66_data
          render json: { error: 'Invalid image_data format.' }, status: :bad_request
          return
        end

        # Base64データの形式が正しいか（基本的な文字セット）を検証
        unless base66_data =~ /^[A-Za-z0-9+\/]+={0,2}$/
          render json: { error: 'Invalid Base64 characters in image data.' }, status: :bad_request
          return
        end

        begin
          decoded_image = Base64.decode64(base66_data)

          filename = "#{@drawing.title.presence || 'untitled'}.#{format}"
          type = "image/#{format}"

          send_data decoded_image, filename: filename, type: type, disposition: 'attachment'
        rescue ArgumentError => e
          render json: { error: "Failed to decode image data: #{e.message}" }, status: :bad_request
        rescue => e
          Rails.logger.error("Drawing export failed: #{e.message}")
          render json: { error: 'Failed to export drawing.' }, status: :internal_server_error
        end
      end

      private

      def set_drawing
        @drawing = current_user.drawings.find(params[:id])
      end

      def drawing_params
        params.require(:drawing).permit(:title, :user_id)
      end
    end
  end
end
