require 'rails_helper'

RSpec.describe DrawingElement, type: :model do
  let(:user) { create(:user) }
  let(:drawing) { create(:drawing, user: user) }

  describe 'validations' do
    it 'requires a drawing' do
      element = DrawingElement.new(user: user, element_type: 'line')
      expect(element).not_to be_valid
      expect(element.errors[:drawing]).to include("must exist")
    end

    it 'requires a user' do
      element = DrawingElement.new(drawing: drawing, element_type: 'line')
      expect(element).not_to be_valid
      expect(element.errors[:user]).to include("must exist")
    end

    it 'requires an element_type' do
      element = DrawingElement.new(drawing: drawing, user: user)
      expect(element).not_to be_valid
      expect(element.errors[:element_type]).to include("can't be blank")
    end
  end

  describe 'creation' do
    it 'creates a valid drawing element' do
      element = DrawingElement.new(
        drawing: drawing,
        user: user,
        element_type: 'line',
        data: {
          'start' => { 'x' => 0, 'y' => 0 },
          'end' => { 'x' => 100, 'y' => 100 }
        }
      )
      expect(element).to be_valid
      expect(element.save).to be true
    end
  end
end
