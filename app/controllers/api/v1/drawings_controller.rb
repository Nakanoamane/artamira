module Api
  module V1
    class DrawingsController < ApplicationController
      before_action :set_drawing, only: [:show, :update, :destroy]

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

      private

      def set_drawing
        @drawing = Drawing.find(params[:id])
      end

      def drawing_params
        params.require(:drawing).permit(:title, :user_id)
      end
    end
  end
end
