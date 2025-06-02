module Api
  module V1
    class DrawingsController < ApplicationController
      before_action :set_drawing, only: [:show, :update, :destroy, :save]

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
