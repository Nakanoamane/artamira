require 'rails_helper'

RSpec.describe DrawingChannel, type: :channel do
  let(:user) { create(:user) }
  let(:drawing) { create(:drawing, user: user) }

  before do
    stub_connection current_user: user
  end

  it "rejects subscription without drawing_id" do
    subscribe
    expect(subscription).to be_rejected
  end

  it "subscribes with drawing_id" do
    subscribe(drawing_id: drawing.id)
    expect(subscription).to be_confirmed
  end

  describe "#draw" do
    before { subscribe(drawing_id: drawing.id) }

    it "creates a new drawing element" do
      element_data = {
        'element_type' => 'line',
        'element_data' => {
          'start' => { 'x' => 0, 'y' => 0 },
          'end' => { 'x' => 100, 'y' => 100 }
        }
      }

      expect {
        perform :draw, element_data
      }.to change(DrawingElement, :count).by(1)

      element = DrawingElement.last
      expect(element.element_type).to eq('line')
      expect(element.user_id).to eq(user.id)
      expect(element.drawing_id).to eq(drawing.id)
    end

    it "broadcasts the created drawing element" do
      element_data = {
        'element_type' => 'circle',
        'element_data' => {
          'center' => { 'x' => 50, 'y' => 50 },
          'radius' => 20
        }
      }

      expect { perform :draw, element_data }
        .to have_broadcasted_to(drawing)
        .with { |data| data['type'] == 'drawing_element_created' && data['drawing_element']['element_type'] == 'circle' }
    end

    context "when drawing element creation fails" do
      let(:invalid_element_data) do
        {
          'element_type' => nil, # 無効なデータ
          'element_data' => {}
        }
      end

      it "does not create a drawing element" do
        expect { perform :draw, invalid_element_data }
          .not_to change(DrawingElement, :count)
      end

      it "does not broadcast any message" do
        expect { perform :draw, invalid_element_data }
          .not_to have_broadcasted_to(drawing)
      end

      it "logs the validation error" do
        # Rails.logger をモックしてログ出力を確認
        allow(Rails.logger).to receive(:error)

        perform :draw, invalid_element_data

        expect(Rails.logger).to have_received(:error)
          .with(/ERROR: DrawingElement creation failed: /)
      end
    end

    context "when current_user is not present" do
      before do
        stub_connection current_user: nil
        subscribe(drawing_id: drawing.id) # 再購読してcurrent_userをnilにする
      end

      it "does not create a drawing element" do
        element_data = {
          'element_type' => 'line',
          'element_data' => {
            'start' => { 'x' => 0, 'y' => 0 },
            'end' => { 'x' => 100, 'y' => 100 }
          }
        }

        expect { perform :draw, element_data }
          .not_to change(DrawingElement, :count)
      end

      it "does not broadcast any message" do
        element_data = {
          'element_type' => 'line',
          'element_data' => {
            'start' => { 'x' => 0, 'y' => 0 },
            'end' => { 'x' => 100, 'y' => 100 }
          }
        }

        expect { perform :draw, element_data }
          .not_to have_broadcasted_to(drawing)
      end
    end
  end

  describe "#undo_redo" do
    let(:elements) do
      [
        {
          'id' => 1,
          'type' => 'line',
          'points' => [[0, 0], [10, 10]],
          'color' => '#000000',
          'brushSize' => 5
        }
      ]
    end
    let(:client_id) { 'test_client_id' }

    before { subscribe(drawing_id: drawing.id) }

    it "broadcasts the undo/redo action with correct data" do
      action_type = "undo"

      expect { perform :undo_redo, action_type: action_type, elements: elements, client_id: client_id }
        .to have_broadcasted_to(drawing)
        .with do |data|
          expect(data['type']).to eq('undo_redo_action')
          expect(data['action_type']).to eq(action_type)
          expect(data['elements']).to eq(elements)
          expect(data['drawing_id']).to eq(drawing.id)
          expect(data['user_id']).to eq(user.id)
          expect(data['client_id']).to eq(client_id)
        end
    end
  end
end
