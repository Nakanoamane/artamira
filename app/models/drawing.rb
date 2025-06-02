class Drawing < ApplicationRecord
  belongs_to :user
  has_many :drawing_elements, dependent: :destroy

  validates :title, presence: true
end
