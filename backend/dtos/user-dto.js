module.exports = class UserDto {
  email;
  id;
  is_email_verified;
  first_name;
  last_name;
  phone;
  address_details;
  avatarURL;
  is_sitter;
  middle_name;
  confidant_first_name;
  confidant_last_name;
  confidant_middle_name;
  confidant_phone;

  constructor(model) {
    this.email = model.email;
    this.id = model.id;
    this.is_email_verified = model.is_email_verified;
    this.first_name = model.first_name;
    this.last_name = model.last_name;
    this.phone = model.phone;
    this.address_details = model.address_details;
    this.avatarURL = model.avatarURL;
    this.is_sitter = model.is_sitter;
    this.middle_name = model.middle_name;
    this.confidant_first_name = model.confidant_first_name;
    this.confidant_last_name = model.confidant_last_name;
    this.confidant_middle_name = model.confidant_middle_name;
    this.confidant_phone = model.confidant_phone;
  }
};
