import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faList, faComments, faUser } from '@fortawesome/free-solid-svg-icons';

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <a className="tab active">
        <FontAwesomeIcon icon={faHouse} className="nav-ico" />
        <span>خانه</span>
      </a>
      <a className="tab">
        <FontAwesomeIcon icon={faList} className="nav-ico" />
        <span>سبد خرید</span>
      </a>
      <a className="tab">
        <FontAwesomeIcon icon={faComments} className="nav-ico" />
        <span>گفتگو</span>
      </a>
      <a className="tab">
        <FontAwesomeIcon icon={faUser} className="nav-ico" />
        <span>حساب</span>
      </a>
    </nav>
  );
}
