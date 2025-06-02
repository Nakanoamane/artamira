class DrawingElement < ApplicationRecord
  belongs_to :drawing
  belongs_to :user

  validates :element_type, presence: true
  validates :data, presence: true
end
