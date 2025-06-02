module Api
  module V1
    class DrawingElementsController < ApplicationController
      before_action :set_drawing, only: [:index, :create]
      before_action :set_drawing_element, only: [:show, :update, :destroy]

      def index
        @drawing_elements = @drawing.drawing_elements
        render json: @drawing_elements
      end

      def show
        render json: @drawing_element
      end

      def create
        @drawing_element = @drawing.drawing_elements.build(drawing_element_params)
        @drawing_element.user_id = params[:user_id] # 後で認証システムから取得するように変更

        if @drawing_element.save
          # Action Cableを通じて他のクライアントに通知
          ActionCable.server.broadcast "drawing_#{@drawing.id}", {
            type: 'drawing_element_created',
            drawing_element: @drawing_element
          }
          render json: @drawing_element, status: :created
        else
          render json: @drawing_element.errors, status: :unprocessable_entity
        end
      end

      def update
        if @drawing_element.update(drawing_element_params)
          ActionCable.server.broadcast "drawing_#{@drawing_element.drawing_id}", {
            type: 'drawing_element_updated',
            drawing_element: @drawing_element
          }
          render json: @drawing_element
        else
          render json: @drawing_element.errors, status: :unprocessable_entity
        end
      end

      def destroy
        drawing_id = @drawing_element.drawing_id
        @drawing_element.destroy
        ActionCable.server.broadcast "drawing_#{drawing_id}", {
          type: 'drawing_element_deleted',
          drawing_element_id: params[:id]
        }
        head :no_content
      end

      private

      def set_drawing
        @drawing = Drawing.find(params[:drawing_id])
      end

      def set_drawing_element
        @drawing_element = DrawingElement.find(params[:id])
      end

      def drawing_element_params
        params.require(:drawing_element).permit(:element_type, data: {})
      end
    end
  end
end
