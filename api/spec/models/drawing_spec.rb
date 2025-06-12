require 'rails_helper'

RSpec.describe Drawing, type: :model do
  it "has a last_saved_at attribute" do
    drawing = Drawing.new
    expect(drawing).to respond_to(:last_saved_at)
  end

  it "has a last_saved_at attribute of datetime type" do
    drawing = Drawing.new(last_saved_at: Time.current)
    expect(drawing.last_saved_at).to be_a(Time)
  end
end
